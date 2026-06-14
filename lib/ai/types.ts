// ============================================================
// AIProvider — adapter de IA (Fase 5)
//
// Qualquer provider (gemini, openai, groq, ...) implementa esta
// interface. A escolha do provider em uso é feita por AI_PROVIDER
// (ver lib/ai/index.ts).
// ============================================================

export type ComprovanteExtraido = {
  valor: number | null;
  data: string | null; // YYYY-MM-DD
  categoria: string | null;
  descricao: string | null;
  estabelecimento: string | null;
};

export type IntencaoMensagem =
  | "despesa"
  | "receita"
  | "confirmacao"
  | "cancelamento"
  | "correcao"
  | "desconhecido";

export type MensagemInterpretada = {
  intencao: IntencaoMensagem;
  valor: number | null;
  categoria: string | null;
  data: string | null;
  descricao: string | null;
};

export interface AIProvider {
  /** Transcreve um áudio (ex: nota de voz do WhatsApp) para texto. */
  transcreverAudio(arquivo: Buffer, mimeType: string): Promise<string>;

  /** Extrai dados estruturados de uma foto de comprovante/nota fiscal. */
  lerComprovante(imagem: Buffer, mimeType: string): Promise<ComprovanteExtraido>;

  /** Interpreta uma mensagem de texto (comando ou confirmação) e extrai a intenção. */
  interpretarMensagem(texto: string): Promise<MensagemInterpretada>;
}

export class AIProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AIProviderError";
  }
}
