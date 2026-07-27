import { LANCAMENTO_CATEGORIAS } from "@/lib/types";
import {
  DEFAULT_PROMPT_INTERPRETAR_MENSAGEM,
  DEFAULT_PROMPT_LER_COMPROVANTE,
  DEFAULT_PROMPT_TRANSCREVER_AUDIO,
  INTENCOES,
  intencaoValida,
  toDateOrNull,
  toItensOrEmpty,
  toNumberOrNull,
  toStringOrNull,
} from "./prompts";
import {
  AIProviderError,
  type AIProvider,
  type ComprovanteExtraido,
  type ConfiguracaoIA,
  type MensagemInterpretada,
} from "./types";

// Fallback só é usado se GEMINI_MODEL não estiver setado (env ausente em algum
// ambiente). "gemini-2.0-flash" está com quota 0 na conta atual — usar um
// modelo validado como fallback evita quebra silenciosa em produção.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

/**
 * Provider Gemini (multimodal): mesmo modelo Flash para transcrição de
 * áudio, OCR/extração de comprovante e interpretação de texto. Sempre
 * responde em JSON mode (responseMimeType: "application/json") e o parse
 * é feito de forma segura — qualquer falha gera AIProviderError, que o
 * webhook trata como "extração falhou, pedir valor manualmente".
 *
 * Todos os métodos aceitam um `config?: ConfiguracaoIA` opcional
 * (`configuracoes_ia` por empresa) para sobrescrever modelo, prompts e
 * categorias; campos ausentes caem no padrão acima / `LANCAMENTO_CATEGORIAS`.
 */
export class GeminiProvider implements AIProvider {
  private get apiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new AIProviderError("GEMINI_API_KEY não configurada.");
    return key;
  }

  async transcreverAudio(arquivo: Buffer, mimeType: string, config?: ConfiguracaoIA): Promise<string> {
    const prompt = config?.promptTranscreverAudio ?? DEFAULT_PROMPT_TRANSCREVER_AUDIO;

    const json = await this.callJson(
      [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: arquivo.toString("base64") } },
      ],
      config?.modelo,
    );

    const transcricao = json["transcricao"];
    if (typeof transcricao !== "string") {
      throw new AIProviderError("Resposta da IA sem campo 'transcricao'.");
    }
    return transcricao.trim();
  }

  async lerComprovante(imagem: Buffer, mimeType: string, config?: ConfiguracaoIA): Promise<ComprovanteExtraido> {
    const categoriasDespesa = (config?.categoriasDespesa ?? LANCAMENTO_CATEGORIAS.despesa).join(", ");
    const template = config?.promptLerComprovante ?? DEFAULT_PROMPT_LER_COMPROVANTE;
    const prompt = template.replace(/\{\{CATEGORIAS_DESPESA\}\}/g, categoriasDespesa);

    const json = await this.callJson(
      [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imagem.toString("base64") } },
      ],
      config?.modelo,
    );

    return {
      valor: toNumberOrNull(json["valor"]),
      data: toDateOrNull(json["data"]),
      categoria: toStringOrNull(json["categoria"]),
      descricao: toStringOrNull(json["descricao"]),
      estabelecimento: toStringOrNull(json["estabelecimento"]),
    };
  }

  async interpretarMensagem(texto: string, config?: ConfiguracaoIA): Promise<MensagemInterpretada> {
    const categoriasDespesa = (config?.categoriasDespesa ?? LANCAMENTO_CATEGORIAS.despesa).join(", ");
    const categoriasReceita = (config?.categoriasReceita ?? LANCAMENTO_CATEGORIAS.receita).join(", ");
    const template = config?.promptInterpretarMensagem ?? DEFAULT_PROMPT_INTERPRETAR_MENSAGEM;

    const instrucoes = template
      .replace(/\{\{CATEGORIAS_DESPESA\}\}/g, categoriasDespesa)
      .replace(/\{\{CATEGORIAS_RECEITA\}\}/g, categoriasReceita)
      .replace(/\{\{INTENCOES\}\}/g, INTENCOES.join(", "));

    const prompt = `${instrucoes}\n\nMensagem: """${texto}"""`;

    const json = await this.callJson([{ text: prompt }], config?.modelo);

    return {
      intencao: intencaoValida(json["intencao"]),
      data: toDateOrNull(json["data"]),
      motorista: toStringOrNull(json["motorista"]),
      itens: toItensOrEmpty(json["itens"]),
    };
  }

  private async callJson(parts: GeminiPart[], modelo?: string | null): Promise<Record<string, unknown>> {
    const model = modelo || GEMINI_MODEL;
    const url = `${GEMINI_API_URL}/${model}:generateContent?key=${this.apiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          // thinkingBudget: 0 desativa o modo "thinking" — reduz bastante a
          // latência (e o custo em tokens) sem perder qualidade nas tarefas
          // de extração/transcrição, que são diretas o suficiente pra não
          // precisar de raciocínio estendido.
          generationConfig: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
    } catch (err) {
      throw new AIProviderError("Falha ao chamar a API do Gemini.", err);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AIProviderError(`Gemini retornou ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = await res.json().catch((err) => {
      throw new AIProviderError("Resposta do Gemini não é um JSON válido.", err);
    });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new AIProviderError("Resposta do Gemini sem conteúdo de texto.");
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      throw new AIProviderError("Conteúdo retornado pelo Gemini não é JSON válido.", err);
    }
  }
}
