"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

export async function criarUsuario(
  _prev: PerfilAcessoFormState,
  formData: FormData,
): Promise<PerfilAcessoFormState> {
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const nome = (formData.get("nome") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const senha = formData.get("senha") as string;
  const role = (formData.get("role") as string) === "admin" ? "admin" : "operador";
  const perfilIdRaw = formData.get("perfil_id") as string;
  const perfilId = perfilIdRaw && perfilIdRaw !== "none" ? perfilIdRaw : null;

  if (!nome || !email) return { error: "Informe nome e e-mail." };
  if (!senha || senha.length < 6) return { error: "Senha deve ter pelo menos 6 caracteres." };

  const admin = createServiceClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return {
      error:
        authError?.code === "email_exists"
          ? "Já existe um usuário com esse e-mail."
          : "Não foi possível criar o usuário.",
    };
  }

  const { error: dbError } = await admin.from("usuarios").insert({
    id: authData.user.id,
    empresa_id: empresaId,
    nome,
    role,
    perfil_id: role === "admin" ? null : perfilId,
  });

  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "Não foi possível salvar o usuário." };
  }

  revalidatePath("/admin/perfil-acesso");
  return { success: true };
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
