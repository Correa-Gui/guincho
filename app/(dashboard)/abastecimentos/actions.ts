"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseValor } from "@/lib/parse";

export type AbastecimentoFormState = { error?: string; success?: boolean };

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
  const veiculoId = (formData.get("veiculo_id") as string) || null;
  if (!veiculoId) return null;

  const litros = parseValor(String(formData.get("litros") ?? "0"));
  const valorTotal = parseValor(String(formData.get("valor_total") ?? "0"));
  if (litros === null || litros <= 0 || valorTotal === null || valorTotal <= 0) return null;

  const kmAtualRaw = (formData.get("km_atual") as string)?.trim();
  const kmAtual = kmAtualRaw ? Number(kmAtualRaw) : null;
  if (kmAtual !== null && !Number.isInteger(kmAtual)) return null;

  return {
    veiculo_id: veiculoId,
    motorista_id: (formData.get("motorista_id") as string) || null,
    data: (formData.get("data") as string) || new Date().toISOString().slice(0, 10),
    litros,
    valor_litro: Math.round((valorTotal / litros) * 1000) / 1000,
    valor_total: valorTotal,
    km_atual: kmAtual,
    posto: (formData.get("posto") as string) || null,
    observacoes: (formData.get("observacoes") as string) || null,
  };
}

export async function createAbastecimento(
  _prev: AbastecimentoFormState,
  formData: FormData,
): Promise<AbastecimentoFormState> {
  const supabase = await createClient();
  const empresaId = await getEmpresaId();
  if (!empresaId) return { error: "Usuário sem empresa vinculada." };

  const payload = buildPayload(formData);
  if (!payload) return { error: "Preencha veículo, litros e valor total corretamente." };

  const { data: veiculo } = await supabase
    .from("veiculos_frota")
    .select("placa")
    .eq("id", payload.veiculo_id)
    .single();

  const { data: lancamento, error: lancamentoError } = await supabase
    .from("lancamentos_financeiros")
    .insert({
      empresa_id: empresaId,
      tipo: "despesa",
      categoria: "Combustível",
      valor: payload.valor_total,
      descricao: `Abastecimento${veiculo?.placa ? ` - ${veiculo.placa}` : ""}${payload.posto ? ` - ${payload.posto}` : ""}`,
      data: payload.data,
      origem: "abastecimento",
    })
    .select("id")
    .single();

  if (lancamentoError) return { error: "Não foi possível salvar o abastecimento." };

  const { error } = await supabase
    .from("abastecimentos")
    .insert({ ...payload, empresa_id: empresaId, lancamento_id: lancamento?.id ?? null });

  if (error) {
    if (lancamento?.id) await supabase.from("lancamentos_financeiros").delete().eq("id", lancamento.id);
    return { error: "Não foi possível salvar o abastecimento." };
  }

  revalidatePath("/abastecimentos");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function updateAbastecimento(
  id: string,
  _prev: AbastecimentoFormState,
  formData: FormData,
): Promise<AbastecimentoFormState> {
  const supabase = await createClient();

  const payload = buildPayload(formData);
  if (!payload) return { error: "Preencha veículo, litros e valor total corretamente." };

  const { data: atual } = await supabase
    .from("abastecimentos")
    .select("lancamento_id")
    .eq("id", id)
    .single();

  const { data: veiculo } = await supabase
    .from("veiculos_frota")
    .select("placa")
    .eq("id", payload.veiculo_id)
    .single();

  const { error } = await supabase.from("abastecimentos").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar o abastecimento." };

  if (atual?.lancamento_id) {
    await supabase
      .from("lancamentos_financeiros")
      .update({
        valor: payload.valor_total,
        descricao: `Abastecimento${veiculo?.placa ? ` - ${veiculo.placa}` : ""}${payload.posto ? ` - ${payload.posto}` : ""}`,
        data: payload.data,
      })
      .eq("id", atual.lancamento_id);
  }

  revalidatePath("/abastecimentos");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAbastecimento(id: string) {
  const supabase = await createClient();

  const { data: atual } = await supabase
    .from("abastecimentos")
    .select("lancamento_id")
    .eq("id", id)
    .single();

  await supabase.from("abastecimentos").delete().eq("id", id);

  if (atual?.lancamento_id) {
    await supabase.from("lancamentos_financeiros").delete().eq("id", atual.lancamento_id);
  }

  revalidatePath("/abastecimentos");
  revalidatePath("/financeiro");
  revalidatePath("/");
}
