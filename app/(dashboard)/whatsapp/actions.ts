"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WhatsappFormState = { error?: string; success?: boolean };

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

export async function createGrupo(
  _prev: WhatsappFormState,
  formData: FormData,
): Promise<WhatsappFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const grupoJid = (formData.get("grupo_jid") as string)?.trim();
  if (!grupoJid.endsWith("@g.us")) {
    return { error: "JID do grupo deve terminar em @g.us." };
  }

  const nome = (formData.get("nome") as string)?.trim() || null;

  const { error } = await supabase
    .from("grupos_whatsapp")
    .insert({ empresa_id: empresaId, grupo_jid: grupoJid, nome, ativo: true });

  if (error) {
    return {
      error: error.code === "23505" ? "Esse grupo já está cadastrado." : "Não foi possível salvar o grupo.",
    };
  }

  revalidatePath("/whatsapp");
  return { success: true };
}

export async function toggleGrupo(id: string, ativo: boolean) {
  const supabase = await createClient();
  await supabase.from("grupos_whatsapp").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/whatsapp");
}

export async function deleteGrupo(id: string) {
  const supabase = await createClient();
  await supabase.from("grupos_whatsapp").delete().eq("id", id);

  revalidatePath("/whatsapp");
}
