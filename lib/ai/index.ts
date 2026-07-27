import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { AIProviderError, type AIProvider } from "./types";

export type {
  AIProvider,
  ComprovanteExtraido,
  ConfiguracaoIA,
  IntencaoMensagem,
  ItemLancamento,
  MensagemInterpretada,
} from "./types";
export { AIProviderError };
export { buscarConfiguracaoIA, categoriasDaConfiguracao } from "./configuracao";
export {
  DEFAULT_PROMPT_INTERPRETAR_MENSAGEM,
  DEFAULT_PROMPT_LER_COMPROVANTE,
  DEFAULT_PROMPT_TRANSCREVER_AUDIO,
} from "./prompts";

/** Providers disponíveis pra seleção na UI de configurações. */
export const AI_PROVIDERS = [
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI" },
] as const;

/**
 * Resolve o AIProvider a usar. `provider` normalmente vem de
 * `configuracoes_ia.provider` (por empresa); se ausente, cai em
 * AI_PROVIDER do ambiente (default "gemini"). Não há cache: cada empresa
 * pode escolher um provider diferente, então uma instância global fixa
 * ficaria errada assim que houvesse mais de uma configuração.
 * Para adicionar um novo provider (ex: "groq"), crie a implementação de
 * AIProvider e registre o case abaixo.
 */
export function getAIProvider(provider?: string | null): AIProvider {
  const chave = provider || process.env.AI_PROVIDER || "gemini";
  switch (chave) {
    case "gemini":
      return new GeminiProvider();
    case "openai":
      return new OpenAIProvider();
    default:
      throw new AIProviderError(`Provider de IA desconhecido: "${chave}".`);
  }
}
