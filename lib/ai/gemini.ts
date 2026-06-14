import { LANCAMENTO_CATEGORIAS } from "@/lib/types";
import {
  AIProviderError,
  type AIProvider,
  type ComprovanteExtraido,
  type IntencaoMensagem,
  type MensagemInterpretada,
} from "./types";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const CATEGORIAS_DESPESA = LANCAMENTO_CATEGORIAS.despesa.join(", ");
const CATEGORIAS_RECEITA = LANCAMENTO_CATEGORIAS.receita.join(", ");
const INTENCOES: IntencaoMensagem[] = [
  "despesa",
  "receita",
  "confirmacao",
  "cancelamento",
  "correcao",
  "desconhecido",
];

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

/**
 * Provider Gemini (multimodal): mesmo modelo Flash para transcrição de
 * áudio, OCR/extração de comprovante e interpretação de texto. Sempre
 * responde em JSON mode (responseMimeType: "application/json") e o parse
 * é feito de forma segura — qualquer falha gera AIProviderError, que o
 * webhook trata como "extração falhou, pedir valor manualmente".
 */
export class GeminiProvider implements AIProvider {
  private get apiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new AIProviderError("GEMINI_API_KEY não configurada.");
    return key;
  }

  async transcreverAudio(arquivo: Buffer, mimeType: string): Promise<string> {
    const prompt =
      "Transcreva o áudio abaixo (em português do Brasil) literalmente, sem resumir. " +
      'Responda apenas em JSON, no formato {"transcricao": "texto transcrito"}.';

    const json = await this.callJson([
      { text: prompt },
      { inline_data: { mime_type: mimeType, data: arquivo.toString("base64") } },
    ]);

    const transcricao = json["transcricao"];
    if (typeof transcricao !== "string") {
      throw new AIProviderError("Resposta da IA sem campo 'transcricao'.");
    }
    return transcricao.trim();
  }

  async lerComprovante(imagem: Buffer, mimeType: string): Promise<ComprovanteExtraido> {
    const prompt = `Analise a foto de comprovante/nota fiscal/recibo abaixo e extraia os dados do gasto.
Responda apenas em JSON, no formato exato:
{"valor": number|null, "data": "YYYY-MM-DD"|null, "categoria": string|null, "descricao": string|null, "estabelecimento": string|null}

Regras:
- "valor": valor total pago, em reais, como número (ex: 123.45). Se não conseguir ler com confiança, use null.
- "data": data da compra no formato YYYY-MM-DD. Se não houver data visível, use null.
- "categoria": escolha a categoria que melhor descreve o gasto entre: ${CATEGORIAS_DESPESA}.
- "descricao": breve descrição do que foi comprado/pago (ex: "Diesel S10", "Troca de óleo").
- "estabelecimento": nome do estabelecimento/posto/loja, se visível.`;

    const json = await this.callJson([
      { text: prompt },
      { inline_data: { mime_type: mimeType, data: imagem.toString("base64") } },
    ]);

    return {
      valor: toNumberOrNull(json["valor"]),
      data: toDateOrNull(json["data"]),
      categoria: toStringOrNull(json["categoria"]),
      descricao: toStringOrNull(json["descricao"]),
      estabelecimento: toStringOrNull(json["estabelecimento"]),
    };
  }

  async interpretarMensagem(texto: string): Promise<MensagemInterpretada> {
    const prompt = `Interprete a mensagem de WhatsApp abaixo, enviada num grupo de gestão financeira de uma transportadora.
Responda apenas em JSON, no formato exato:
{"intencao": string, "valor": number|null, "categoria": string|null, "data": "YYYY-MM-DD"|null, "descricao": string|null}

Regras:
- "intencao": uma das opções: ${INTENCOES.join(", ")}.
  - "despesa": a mensagem descreve um gasto (ex: "/gasto 50 combustível").
  - "receita": a mensagem descreve um ganho/recebimento (ex: "/ganho 500 frete").
  - "confirmacao": a mensagem confirma um lançamento pendente (ex: "sim", "confirma", "ok pode salvar").
  - "cancelamento": a mensagem cancela/nega um lançamento pendente (ex: "não", "cancela", "errado").
  - "correcao": a mensagem corrige um valor/dado de um lançamento pendente.
  - "desconhecido": não se encaixa em nenhuma das opções acima.
- "valor": valor em reais como número (ex: 50, 1234.56), se houver. Senão null.
- "categoria": se intencao for "despesa", escolha entre: ${CATEGORIAS_DESPESA}. Se "receita", escolha entre: ${CATEGORIAS_RECEITA}. Senão null.
- "data": se a mensagem mencionar uma data explícita, no formato YYYY-MM-DD. Senão null (assume-se hoje).
- "descricao": breve descrição do lançamento, se houver. Senão null.

Mensagem: """${texto}"""`;

    const json = await this.callJson([{ text: prompt }]);

    const intencao = INTENCOES.includes(json["intencao"] as IntencaoMensagem)
      ? (json["intencao"] as IntencaoMensagem)
      : "desconhecido";

    return {
      intencao,
      valor: toNumberOrNull(json["valor"]),
      categoria: toStringOrNull(json["categoria"]),
      data: toDateOrNull(json["data"]),
      descricao: toStringOrNull(json["descricao"]),
    };
  }

  private async callJson(parts: GeminiPart[]): Promise<Record<string, unknown>> {
    const url = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: "application/json" },
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

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalizado = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalizado);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}
