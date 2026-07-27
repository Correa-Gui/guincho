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

/** Um lançamento (receita ou despesa) extraído da mensagem. */
export type ItemLancamento = {
  tipo: "receita" | "despesa";
  valor: number | null;
  categoria: string | null;
  data: string | null;
  descricao: string | null;
  /** Local de origem do trajeto (ex: "socorro de Jaboticabal até Taiúçu"). Senão null. */
  origem: string | null;
  /** Local de destino do trajeto. Senão null. */
  destino: string | null;
  /** Nome do segurado/cliente dono do veículo guinchado (ex: "segurado: Maria Silva"). Senão null. */
  segurado: string | null;
  /** Placa do veículo do cliente guinchado, como veio na mensagem (sem normalizar). Senão null. */
  placaCliente: string | null;
};

export type MensagemInterpretada = {
  intencao: IntencaoMensagem;
  /** Data padrão da mensagem (ex: "ontem"), usada como fallback p/ itens sem data própria. */
  data: string | null;
  /**
   * Nome do motorista mencionado explicitamente na mensagem (ex: "motorista:
   * Fulano", "o Cicero fez esse frete"). Usado como override quando quem
   * envia a mensagem não é o próprio motorista (ex: despachante lançando em
   * nome dele). Null se não mencionado — nesse caso o motorista é inferido
   * pelo número de quem enviou a mensagem no grupo.
   */
  motorista: string | null;
  /**
   * Lançamentos extraídos da mensagem. Uma mensagem pode conter vários
   * (ex: "recebi 300 do frete e gastei 40 de almoço" -> 2 itens). Para
   * intenções sem lançamento (confirmacao/cancelamento/desconhecido) fica
   * vazio. Para "correcao", contém o(s) item(ns) com os campos corrigidos.
   */
  itens: ItemLancamento[];
};

/**
 * Overrides configuráveis por empresa (tabela `configuracoes_ia`). Qualquer
 * campo `null`/ausente cai no padrão do código (`DEFAULT_*` em
 * `lib/ai/gemini.ts` e `LANCAMENTO_CATEGORIAS` em `lib/types.ts`).
 */
export type ConfiguracaoIA = {
  /** "gemini" | "openai". Null/ausente -> usa AI_PROVIDER do ambiente (default "gemini"). */
  provider: string | null;
  modelo: string | null;
  categoriasReceita: string[] | null;
  categoriasDespesa: string[] | null;
  promptTranscreverAudio: string | null;
  promptLerComprovante: string | null;
  promptInterpretarMensagem: string | null;
};

export interface AIProvider {
  /** Transcreve um áudio (ex: nota de voz do WhatsApp) para texto. */
  transcreverAudio(arquivo: Buffer, mimeType: string, config?: ConfiguracaoIA): Promise<string>;

  /** Extrai dados estruturados de uma foto de comprovante/nota fiscal. */
  lerComprovante(imagem: Buffer, mimeType: string, config?: ConfiguracaoIA): Promise<ComprovanteExtraido>;

  /** Interpreta uma mensagem de texto (comando ou confirmação) e extrai a intenção. */
  interpretarMensagem(texto: string, config?: ConfiguracaoIA): Promise<MensagemInterpretada>;
}

export class AIProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AIProviderError";
  }
}
