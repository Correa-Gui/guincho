import { GeminiProvider } from "./gemini";
import { AIProviderError, type AIProvider } from "./types";

export type {
  AIProvider,
  ComprovanteExtraido,
  IntencaoMensagem,
  MensagemInterpretada,
} from "./types";
export { AIProviderError };

let cached: AIProvider | null = null;

/**
 * Resolve o AIProvider configurado em AI_PROVIDER (default: "gemini").
 * Para adicionar um novo provider (ex: "openai", "groq"), crie a
 * implementação de AIProvider e registre o case abaixo.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const provider = process.env.AI_PROVIDER ?? "gemini";
  switch (provider) {
    case "gemini":
      cached = new GeminiProvider();
      break;
    default:
      throw new AIProviderError(`AI_PROVIDER desconhecido: "${provider}".`);
  }

  return cached;
}
