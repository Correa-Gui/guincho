"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseValor } from "@/lib/parse";
import type { ContaStatus, LancamentoTipo } from "@/lib/types";

const CONTA_FIXA_DIA_MIN = 1;
const CONTA_FIXA_DIA_MAX = 28;

export type FinanceiroFormState = { error?: string; success?: boolean };

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

// ============================================================
// Lançamentos financeiros
// ============================================================
function buildLancamentoPayload(formData: FormData) {
  const valor = parseValor(String(formData.get("valor") ?? "0"));
  if (valor === null || valor <= 0) return null;

  return {
    viagem_id: (formData.get("viagem_id") as string) || null,
    motorista_id: (formData.get("motorista_id") as string) || null,
    tipo: (formData.get("tipo") as LancamentoTipo) || "receita",
    categoria: (formData.get("categoria") as string) || "Outros",
    valor,
    descricao: (formData.get("descricao") as string) || null,
    data: (formData.get("data") as string) || new Date().toISOString().slice(0, 10),
  };
}

export async function createLancamento(
  _prev: FinanceiroFormState,
  formData: FormData,
): Promise<FinanceiroFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const payload = buildLancamentoPayload(formData);
  if (!payload) return { error: "Valor inválido." };

  const { error } = await supabase
    .from("lancamentos_financeiros")
    .insert({ ...payload, empresa_id: empresaId });

  if (error) return { error: "Não foi possível salvar o lançamento." };

  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function updateLancamento(
  id: string,
  _prev: FinanceiroFormState,
  formData: FormData,
): Promise<FinanceiroFormState> {
  const supabase = await createClient();

  const payload = buildLancamentoPayload(formData);
  if (!payload) return { error: "Valor inválido." };

  const { error } = await supabase.from("lancamentos_financeiros").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar o lançamento." };

  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function deleteLancamento(id: string) {
  const supabase = await createClient();
  await supabase.from("lancamentos_financeiros").delete().eq("id", id);

  revalidatePath("/financeiro");
  revalidatePath("/");
}

// ============================================================
// Contas a receber
// ============================================================
function buildContaPayload(formData: FormData) {
  const valor = parseValor(String(formData.get("valor") ?? "0"));
  if (valor === null || valor <= 0) return null;

  return {
    cliente_id: (formData.get("cliente_id") as string) || null,
    viagem_id: (formData.get("viagem_id") as string) || null,
    valor,
    vencimento: (formData.get("vencimento") as string) || new Date().toISOString().slice(0, 10),
    status: (formData.get("status") as ContaStatus) || "pendente",
  };
}

export async function createConta(
  _prev: FinanceiroFormState,
  formData: FormData,
): Promise<FinanceiroFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const payload = buildContaPayload(formData);
  if (!payload) return { error: "Valor inválido." };

  const { error } = await supabase
    .from("contas_a_receber")
    .insert({ ...payload, empresa_id: empresaId });

  if (error) return { error: "Não foi possível salvar a conta." };

  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function updateConta(
  id: string,
  _prev: FinanceiroFormState,
  formData: FormData,
): Promise<FinanceiroFormState> {
  const supabase = await createClient();

  const payload = buildContaPayload(formData);
  if (!payload) return { error: "Valor inválido." };

  const { error } = await supabase.from("contas_a_receber").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar a conta." };

  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function deleteConta(id: string) {
  const supabase = await createClient();
  await supabase.from("contas_a_receber").delete().eq("id", id);

  revalidatePath("/financeiro");
  revalidatePath("/");
}

// ============================================================
// Contas fixas (recorrentes mensais)
// ============================================================
function buildContaFixaPayload(formData: FormData) {
  const valor = parseValor(String(formData.get("valor") ?? "0"));
  if (valor === null || valor <= 0) return null;

  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!descricao) return null;

  const diaVencimento = Math.min(
    Math.max(Number(formData.get("dia_vencimento") ?? 1), CONTA_FIXA_DIA_MIN),
    CONTA_FIXA_DIA_MAX,
  );

  return {
    descricao,
    tipo: (formData.get("tipo") as LancamentoTipo) || "despesa",
    categoria: (formData.get("categoria") as string) || "Outros",
    valor,
    dia_vencimento: diaVencimento,
    ativo: formData.get("ativo") === "on",
  };
}

export async function createContaFixa(
  _prev: FinanceiroFormState,
  formData: FormData,
): Promise<FinanceiroFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const payload = buildContaFixaPayload(formData);
  if (!payload) return { error: "Preencha descrição e valor corretamente." };

  const { error } = await supabase
    .from("contas_fixas")
    .insert({ ...payload, empresa_id: empresaId });

  if (error) return { error: "Não foi possível salvar a conta fixa." };

  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function updateContaFixa(
  id: string,
  _prev: FinanceiroFormState,
  formData: FormData,
): Promise<FinanceiroFormState> {
  const supabase = await createClient();

  const payload = buildContaFixaPayload(formData);
  if (!payload) return { error: "Preencha descrição e valor corretamente." };

  const { error } = await supabase.from("contas_fixas").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar a conta fixa." };

  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function deleteContaFixa(id: string) {
  const supabase = await createClient();
  await supabase.from("contas_fixas").delete().eq("id", id);

  revalidatePath("/financeiro");
  revalidatePath("/");
}

export async function toggleContaFixa(id: string, ativo: boolean) {
  const supabase = await createClient();
  await supabase.from("contas_fixas").update({ ativo: !ativo }).eq("id", id);

  revalidatePath("/financeiro");
  revalidatePath("/");
}
