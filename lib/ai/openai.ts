import { LANCAMENTO_CATEGORIAS } from "@/lib/types";
import {
  CIDADES_REGIAO_HINT,
  DEFAULT_PROMPT_INTERPRETAR_MENSAGEM,
  DEFAULT_PROMPT_LER_COMPROVANTE,
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

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_API_URL = "https://api.openai.com/v1";

// Extensão só precisa ser "plausível" pro endpoint de transcrição aceitar o
// upload — não afeta a decodificação real do áudio.
const EXTENSOES: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

/**
 * Provider OpenAI: `gpt-4o-mini`/`gpt-4o` (configurável via `config.modelo`)
 * para leitura de comprovante e interpretação de mensagem (chat completions,
 * `response_format: json_object`). A transcrição de áudio usa o endpoint
 * dedicado `audio/transcriptions` (Whisper) — não é possível reaproveitar
 * `config.modelo` ali, pois é uma família de modelo diferente (não é um chat
 * model); por isso sempre usa `whisper-1`.
 *
 * Nota: o WhatsApp manda notas de voz em `audio/ogg` (Opus). O endpoint de
 * transcrição da OpenAI historicamente prioriza mp3/mp4/wav/webm — se o
 * upload de `.ogg` for rejeitado, o erro vira um `AIProviderError` normal
 * (o webhook já trata isso pedindo o valor manualmente); considere testar
 * lado a lado com o Gemini antes de adotar como padrão pra transcrição.
 */
export class OpenAIProvider implements AIProvider {
  private get apiKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new AIProviderError("OPENAI_API_KEY não configurada.");
    return key;
  }

  async transcreverAudio(arquivo: Buffer, mimeType: string): Promise<string> {
    const ext = EXTENSOES[mimeType] ?? "ogg";
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(arquivo)], { type: mimeType }), `audio.${ext}`);
    form.append("model", "whisper-1");
    form.append("language", "pt");
    // Whisper usa o "prompt" como dica de vocabulário/estilo, não como instrução
    // — nomes de cidade da região reduzem erro em nomes próprios incomuns.
    form.append("prompt", `Nomes de cidade que podem aparecer: ${CIDADES_REGIAO_HINT}.`);

    let res: Response;
    try {
      res = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
      });
    } catch (err) {
      throw new AIProviderError("Falha ao chamar a API da OpenAI (transcrição).", err);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AIProviderError(`OpenAI (transcrição) retornou ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = await res.json().catch((err) => {
      throw new AIProviderError("Resposta da OpenAI (transcrição) não é um JSON válido.", err);
    });

    if (typeof data?.text !== "string") {
      throw new AIProviderError("Resposta da OpenAI sem campo 'text'.");
    }
    return data.text.trim();
  }

  async lerComprovante(imagem: Buffer, mimeType: string, config?: ConfiguracaoIA): Promise<ComprovanteExtraido> {
    const categoriasDespesa = (config?.categoriasDespesa ?? LANCAMENTO_CATEGORIAS.despesa).join(", ");
    const template = config?.promptLerComprovante ?? DEFAULT_PROMPT_LER_COMPROVANTE;
    const prompt = template.replace(/\{\{CATEGORIAS_DESPESA\}\}/g, categoriasDespesa);

    const json = await this.callJson(
      [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${imagem.toString("base64")}` } },
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

    const json = await this.callJson([{ type: "text", text: prompt }], config?.modelo);

    return {
      intencao: intencaoValida(json["intencao"]),
      data: toDateOrNull(json["data"]),
      motorista: toStringOrNull(json["motorista"]),
      itens: toItensOrEmpty(json["itens"]),
    };
  }

  private async callJson(
    content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
    modelo?: string | null,
  ): Promise<Record<string, unknown>> {
    const model = modelo || OPENAI_MODEL;

    let res: Response;
    try {
      res = await fetch(`${OPENAI_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
        }),
      });
    } catch (err) {
      throw new AIProviderError("Falha ao chamar a API da OpenAI.", err);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AIProviderError(`OpenAI retornou ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = await res.json().catch((err) => {
      throw new AIProviderError("Resposta da OpenAI não é um JSON válido.", err);
    });

    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new AIProviderError("Resposta da OpenAI sem conteúdo de texto.");
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      throw new AIProviderError("Conteúdo retornado pela OpenAI não é JSON válido.", err);
    }
  }
}
