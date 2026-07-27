"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseValor } from "@/lib/parse";
import type { ManutencaoTipo } from "@/lib/types";

export type ManutencaoFormState = { error?: string; success?: boolean };

const TIPOS_VALIDOS: ManutencaoTipo[] = [
  "troca_oleo",
  "troca_filtro",
  "balanceamento",
  "alinhamento",
  "rodizio_pneus",
  "troca_pneus",
  "freios",
  "revisao",
  "bateria",
  "outro",
];

async function getEmpresaId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  return usuario?.empresa_id ?? null;
}

function buildPayload(formData: FormData) {
  const tipo = formData.get("tipo") as ManutencaoTipo;
  if (!TIPOS_VALIDOS.includes(tipo)) return null;

  const dataRealizada = (formData.get("data_realizada") as string)?.trim();
  if (!dataRealizada) return null;

  const custoRaw = (formData.get("custo") as string)?.trim();
  const custo = custoRaw ? parseValor(custoRaw) : null;
  if (custoRaw && custo === null) return null;

  return {
    tipo,
    data_realizada: dataRealizada,
    data_proxima: (formData.get("data_proxima") as string) || null,
    custo,
    observacoes: (formData.get("observacoes") as string) || null,
  };
}

function revalidateAll(veiculoId: string) {
  revalidatePath(`/frota/${veiculoId}`);
  revalidatePath("/frota");
  revalidatePath("/");
}

export async function createManutencao(
  veiculoId: string,
  _prev: ManutencaoFormState,
  formData: FormData,
): Promise<ManutencaoFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const payload = buildPayload(formData);
  if (!payload) return { error: "Preencha o tipo e a data corretamente." };

  const { error } = await supabase
    .from("manutencoes_frota")
    .insert({ ...payload, empresa_id: empresaId, veiculo_id: veiculoId });

  if (error) return { error: "Não foi possível salvar a manutenção." };

  revalidateAll(veiculoId);
  return { success: true };
}

export async function updateManutencao(
  id: string,
  veiculoId: string,
  _prev: ManutencaoFormState,
  formData: FormData,
): Promise<ManutencaoFormState> {
  const supabase = await createClient();

  const payload = buildPayload(formData);
  if (!payload) return { error: "Preencha o tipo e a data corretamente." };

  const { error } = await supabase.from("manutencoes_frota").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar a manutenção." };

  revalidateAll(veiculoId);
  return { success: true };
}

export async function deleteManutencao(id: string, veiculoId: string) {
  const supabase = await createClient();
  await supabase.from("manutencoes_frota").delete().eq("id", id);

  revalidateAll(veiculoId);
}
