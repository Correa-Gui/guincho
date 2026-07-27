"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MotoristaFormState = { error?: string; success?: boolean };

function buildPayload(formData: FormData) {
  const nome = (formData.get("nome") as string)?.trim();
  if (!nome) return null;

  return {
    nome,
    telefone: (formData.get("telefone") as string)?.trim() || null,
    ativo: formData.get("ativo") === "on",
  };
}

export async function createMotorista(
  _prev: MotoristaFormState,
  formData: FormData,
): Promise<MotoristaFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .single();
  if (!usuario) return { error: "Usuário sem empresa vinculada." };

  const payload = buildPayload(formData);
  if (!payload) return { error: "Informe o nome do motorista." };

  const { error } = await supabase
    .from("motoristas")
    .insert({ ...payload, empresa_id: usuario.empresa_id });

  if (error) {
    console.error("[createMotorista] supabase error:", error);
    return { error: "Não foi possível salvar o motorista." };
  }

  revalidatePath("/motoristas");
  return { success: true };
}

export async function updateMotorista(
  id: string,
  _prev: MotoristaFormState,
  formData: FormData,
): Promise<MotoristaFormState> {
  const supabase = await createClient();

  const payload = buildPayload(formData);
  if (!payload) return { error: "Informe o nome do motorista." };

  const { error } = await supabase.from("motoristas").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar o motorista." };

  revalidatePath("/motoristas");
  return { success: true };
}

export async function deleteMotorista(id: string) {
  const supabase = await createClient();
  await supabase.from("motoristas").delete().eq("id", id);

  revalidatePath("/motoristas");
}
