import type { SupabaseClient } from "@supabase/supabase-js";
import { LANCAMENTO_CATEGORIAS } from "@/lib/types";
import type { ConfiguracaoIA } from "./types";

type ConfiguracaoIARow = {
  provider: string | null;
  modelo: string | null;
  categorias_receita: string[] | null;
  categorias_despesa: string[] | null;
  prompt_transcrever_audio: string | null;
  prompt_ler_comprovante: string | null;
  prompt_interpretar_mensagem: string | null;
};

/** Busca os overrides de IA da empresa em `configuracoes_ia`. `undefined` se a empresa não tiver linha (usa os padrões). */
export async function buscarConfiguracaoIA(
  supabase: SupabaseClient,
  empresaId: string,
): Promise<ConfiguracaoIA | undefined> {
  const { data } = await supabase
    .from("configuracoes_ia")
    .select(
      "provider, modelo, categorias_receita, categorias_despesa, prompt_transcrever_audio, prompt_ler_comprovante, prompt_interpretar_mensagem",
    )
    .eq("empresa_id", empresaId)
    .maybeSingle<ConfiguracaoIARow>();

  if (!data) return undefined;

  return {
    provider: data.provider,
    modelo: data.modelo,
    categoriasReceita: data.categorias_receita,
    categoriasDespesa: data.categorias_despesa,
    promptTranscreverAudio: data.prompt_transcrever_audio,
    promptLerComprovante: data.prompt_ler_comprovante,
    promptInterpretarMensagem: data.prompt_interpretar_mensagem,
  };
}

/** Categorias efetivas (configuradas pela empresa ou padrão de `LANCAMENTO_CATEGORIAS`). */
export function categoriasDaConfiguracao(config?: ConfiguracaoIA): {
  receita: readonly string[];
  despesa: readonly string[];
} {
  return {
    receita: config?.categoriasReceita ?? LANCAMENTO_CATEGORIAS.receita,
    despesa: config?.categoriasDespesa ?? LANCAMENTO_CATEGORIAS.despesa,
  };
}
