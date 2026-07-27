"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseValor } from "@/lib/parse";
import type { VeiculoStatus } from "@/lib/types";

export type FrotaFormState = { error?: string; success?: boolean };

function buildPayload(formData: FormData) {
  const placa = (formData.get("placa") as string)?.trim().toUpperCase();
  if (!placa) return null;

  const anoRaw = (formData.get("ano") as string)?.trim();
  const ano = anoRaw ? Number(anoRaw) : null;
  if (ano !== null && !Number.isInteger(ano)) return null;

  const consumoRaw = (formData.get("consumo_kml") as string)?.trim();
  const consumoKml = consumoRaw ? parseValor(consumoRaw) : 0;
  if (consumoKml === null) return null;

  const tarifaKmRaw = (formData.get("tarifa_km") as string)?.trim();
  const tarifaKm = tarifaKmRaw ? parseValor(tarifaKmRaw) : 0;
  if (tarifaKm === null) return null;

  return {
    placa,
    modelo: (formData.get("modelo") as string) || null,
    ano,
    status: (formData.get("status") as VeiculoStatus) || "ativo",
    consumo_kml: consumoKml > 0 ? consumoKml : null,
    tarifa_km: tarifaKm > 0 ? tarifaKm : null,
  };
}

export async function createVeiculo(
  _prev: FrotaFormState,
  formData: FormData,
): Promise<FrotaFormState> {
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
  if (!payload) return { error: "Placa ou ano inválido." };

  const { error } = await supabase
    .from("veiculos_frota")
    .insert({ ...payload, empresa_id: usuario.empresa_id });

  if (error) {
    console.error("[createVeiculo] supabase error:", error);
    return { error: "Não foi possível salvar o veículo." };
  }

  revalidatePath("/frota");
  return { success: true };
}

export async function updateVeiculo(
  id: string,
  _prev: FrotaFormState,
  formData: FormData,
): Promise<FrotaFormState> {
  const supabase = await createClient();

  const payload = buildPayload(formData);
  if (!payload) return { error: "Placa ou ano inválido." };

  const { error } = await supabase.from("veiculos_frota").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar o veículo." };

  revalidatePath("/frota");
  return { success: true };
}

export async function deleteVeiculo(id: string) {
  const supabase = await createClient();
  await supabase.from("veiculos_frota").delete().eq("id", id);

  revalidatePath("/frota");
}
