"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseValor } from "@/lib/parse";
import { enviarRelatorioDiarioEmpresa } from "@/lib/whatsapp/relatorio-diario";

export type ConfiguracoesFormState = { error?: string; success?: boolean };

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

function campoTexto(formData: FormData, nome: string): string | null {
  const valor = (formData.get(nome) as string)?.trim();
  return valor ? valor : null;
}

function campoLista(formData: FormData, nome: string): string[] | null {
  const valor = (formData.get(nome) as string) ?? "";
  const itens = valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return itens.length > 0 ? itens : null;
}

export async function salvarConfiguracaoIA(
  _prev: ConfiguracoesFormState,
  formData: FormData,
): Promise<ConfiguracoesFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const provider = campoTexto(formData, "provider");
  if (provider && provider !== "gemini" && provider !== "openai") {
    return { error: "Provider inválido." };
  }

  const { error } = await supabase.from("configuracoes_ia").upsert({
    empresa_id: empresaId,
    provider,
    modelo: campoTexto(formData, "modelo"),
    categorias_receita: campoLista(formData, "categorias_receita"),
    categorias_despesa: campoLista(formData, "categorias_despesa"),
    prompt_transcrever_audio: campoTexto(formData, "prompt_transcrever_audio"),
    prompt_ler_comprovante: campoTexto(formData, "prompt_ler_comprovante"),
    prompt_interpretar_mensagem: campoTexto(formData, "prompt_interpretar_mensagem"),
    atualizado_em: new Date().toISOString(),
  });

  if (error) {
    return { error: "Não foi possível salvar as configurações." };
  }

  revalidatePath("/admin/configuracoes");
  return { success: true };
}

export async function salvarParametrosViagem(
  _prev: ConfiguracoesFormState,
  formData: FormData,
): Promise<ConfiguracoesFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const tarifaKm = parseValor((formData.get("tarifa_km_padrao") as string) ?? "");
  const precoCombustivel = parseValor((formData.get("preco_combustivel_padrao") as string) ?? "");
  if (tarifaKm === null || precoCombustivel === null || tarifaKm <= 0 || precoCombustivel <= 0) {
    return { error: "Valores inválidos." };
  }

  const baseIbge = campoTexto(formData, "base_ibge");
  const baseLat = parseFloat((formData.get("base_lat") as string) ?? "");
  const baseLon = parseFloat((formData.get("base_lon") as string) ?? "");

  const { error } = await supabase
    .from("empresas")
    .update({
      tarifa_km_padrao: tarifaKm,
      preco_combustivel_padrao: precoCombustivel,
      base_endereco: campoTexto(formData, "base_endereco"),
      base_cidade: campoTexto(formData, "base_cidade"),
      base_uf: campoTexto(formData, "base_uf"),
      base_ibge: baseIbge,
      base_lat: baseIbge && Number.isFinite(baseLat) ? baseLat : null,
      base_lon: baseIbge && Number.isFinite(baseLon) ? baseLon : null,
    })
    .eq("id", empresaId);

  if (error) {
    return { error: "Não foi possível salvar os parâmetros." };
  }

  revalidatePath("/admin/configuracoes");
  return { success: true };
}

export async function restaurarConfiguracaoIA(): Promise<void> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return;

  await supabase.from("configuracoes_ia").delete().eq("empresa_id", empresaId);

  revalidatePath("/admin/configuracoes");
}

export async function createDestinatarioRelatorio(
  _prev: ConfiguracoesFormState,
  formData: FormData,
): Promise<ConfiguracoesFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const numero = ((formData.get("numero") as string) ?? "").replace(/\D/g, "");
  if (numero.length < 10) {
    return { error: "Informe o número com DDI e DDD, ex: 5516999999999." };
  }

  const nome = (formData.get("nome") as string)?.trim() || null;

  const { error } = await supabase
    .from("relatorio_diario_destinatarios")
    .insert({ empresa_id: empresaId, numero, nome, ativo: true });

  if (error) {
    return {
      error: error.code === "23505" ? "Esse número já está cadastrado." : "Não foi possível salvar o número.",
    };
  }

  revalidatePath("/admin/configuracoes");
  return { success: true };
}

export async function toggleDestinatarioRelatorio(id: string, ativo: boolean) {
  const supabase = await createClient();
  await supabase.from("relatorio_diario_destinatarios").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/admin/configuracoes");
}

export async function deleteDestinatarioRelatorio(id: string) {
  const supabase = await createClient();
  await supabase.from("relatorio_diario_destinatarios").delete().eq("id", id);

  revalidatePath("/admin/configuracoes");
}

export async function enviarRelatorioDiarioTeste(): Promise<ConfiguracoesFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  try {
    const { enviados } = await enviarRelatorioDiarioEmpresa(supabase, empresaId);
    if (enviados === 0) return { error: "Nenhum número ativo para receber o teste." };
    return { success: true };
  } catch {
    return { error: "Não foi possível enviar o relatório de teste." };
  }
}
