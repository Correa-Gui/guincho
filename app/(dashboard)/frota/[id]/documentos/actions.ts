"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocumentoTipo } from "@/lib/types";

export type DocumentoFormState = { error?: string; success?: boolean };

const TIPOS_VALIDOS: DocumentoTipo[] = [
  "crlv",
  "seguro",
  "antt",
  "tacografo",
  "licenciamento",
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
  const tipo = formData.get("tipo") as DocumentoTipo;
  if (!TIPOS_VALIDOS.includes(tipo)) return null;

  const vencimento = (formData.get("vencimento") as string)?.trim();
  if (!vencimento) return null;

  return {
    tipo,
    numero: (formData.get("numero") as string) || null,
    vencimento,
    observacoes: (formData.get("observacoes") as string) || null,
  };
}

function revalidateAll(veiculoId: string) {
  revalidatePath(`/frota/${veiculoId}`);
  revalidatePath("/frota");
  revalidatePath("/");
}

export async function createDocumento(
  veiculoId: string,
  _prev: DocumentoFormState,
  formData: FormData,
): Promise<DocumentoFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const payload = buildPayload(formData);
  if (!payload) return { error: "Preencha o tipo e o vencimento corretamente." };

  const { error } = await supabase
    .from("documentos_frota")
    .insert({ ...payload, empresa_id: empresaId, veiculo_id: veiculoId });

  if (error) return { error: "Não foi possível salvar o documento." };

  revalidateAll(veiculoId);
  return { success: true };
}

export async function updateDocumento(
  id: string,
  veiculoId: string,
  _prev: DocumentoFormState,
  formData: FormData,
): Promise<DocumentoFormState> {
  const supabase = await createClient();

  const payload = buildPayload(formData);
  if (!payload) return { error: "Preencha o tipo e o vencimento corretamente." };

  const { error } = await supabase.from("documentos_frota").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar o documento." };

  revalidateAll(veiculoId);
  return { success: true };
}

export async function deleteDocumento(id: string, veiculoId: string) {
  const supabase = await createClient();
  await supabase.from("documentos_frota").delete().eq("id", id);

  revalidateAll(veiculoId);
}
