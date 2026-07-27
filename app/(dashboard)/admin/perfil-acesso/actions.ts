"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PerfilAcessoFormState = { error?: string; success?: boolean };

async function getEmpresaId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  return usuario?.empresa_id ?? null;
}

export async function salvarPerfil(
  _prev: PerfilAcessoFormState,
  formData: FormData,
): Promise<PerfilAcessoFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const id = (formData.get("id") as string) || null;
  const nome = (formData.get("nome") as string)?.trim();
  const paginas = formData.getAll("paginas") as string[];

  if (!nome) return { error: "Informe o nome do perfil." };

  const { error } = await supabase
    .from("perfis_acesso")
    .upsert({
      ...(id ? { id } : {}),
      empresa_id: empresaId,
      nome,
      paginas,
    });

  if (error) {
    return { error: "Não foi possível salvar o perfil de acesso." };
  }

  revalidatePath("/admin/perfil-acesso");
  return { success: true };
}

export async function excluirPerfil(id: string) {
  const supabase = await createClient();
  await supabase.from("perfis_acesso").delete().eq("id", id);

  revalidatePath("/admin/perfil-acesso");
}

export async function atribuirPerfilUsuario(
  _prev: PerfilAcessoFormState,
  formData: FormData,
): Promise<PerfilAcessoFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const usuarioId = formData.get("usuario_id") as string;
  const perfilIdRaw = formData.get("perfil_id") as string;
  const perfilId = perfilIdRaw && perfilIdRaw !== "none" ? perfilIdRaw : null;

  const { error } = await supabase
    .from("usuarios")
    .update({ perfil_id: perfilId })
    .eq("id", usuarioId)
    .eq("empresa_id", empresaId);

  if (error) {
    return { error: "Não foi possível atualizar o perfil do usuário." };
  }

  revalidatePath("/admin/perfil-acesso");
  return { success: true };
}
