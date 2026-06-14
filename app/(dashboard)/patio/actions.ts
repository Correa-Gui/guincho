"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PatioFormState = { error?: string; success?: boolean };

export async function createEntrada(
  _prev: PatioFormState,
  formData: FormData,
): Promise<PatioFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .single();
  if (!usuario) return { error: "Usuário sem empresa vinculada." };

  const placa = (formData.get("veiculo_placa") as string)?.trim().toUpperCase();
  if (!placa) return { error: "Placa é obrigatória." };

  const { error } = await supabase.from("patio").insert({
    empresa_id: usuario.empresa_id,
    veiculo_placa: placa,
    motivo: (formData.get("motivo") as string) || null,
    status: "no_patio",
  });

  if (error) return { error: "Não foi possível registrar a entrada." };

  revalidatePath("/patio");
  return { success: true };
}

export async function registrarSaida(id: string) {
  const supabase = await createClient();
  await supabase
    .from("patio")
    .update({ saida: new Date().toISOString(), status: "liberado" })
    .eq("id", id);

  revalidatePath("/patio");
}

export async function deletePatio(id: string) {
  const supabase = await createClient();
  await supabase.from("patio").delete().eq("id", id);

  revalidatePath("/patio");
}
