import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve o nome livre digitado/falado em "segurado" pra um `clientes.id`:
 * casa por nome (case-insensitive) contra os clientes da empresa e, se não
 * achar, cria um cliente novo com esse nome.
 */
export async function resolverClienteId(
  supabase: SupabaseClient,
  empresaId: string,
  segurado: string | null | undefined,
): Promise<string | null> {
  const nome = segurado?.trim();
  if (!nome) return null;

  const { data: existente } = await supabase
    .from("clientes")
    .select("id")
    .eq("empresa_id", empresaId)
    .ilike("nome", nome)
    .limit(1)
    .maybeSingle();
  if (existente) return existente.id;

  const { data: novo, error } = await supabase
    .from("clientes")
    .insert({ empresa_id: empresaId, nome })
    .select("id")
    .single();

  if (error || !novo) {
    console.error("[clientes] falha ao criar cliente", error?.message);
    return null;
  }

  return novo.id;
}
