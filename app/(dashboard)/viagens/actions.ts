"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseValor } from "@/lib/parse";
import { getCoordsComFallback } from "@/lib/ibge";
import { getRota, type PontoRota } from "@/lib/rotas";
import type { ViagemStatus } from "@/lib/types";

export type ViagemFormState = { error?: string; success?: boolean; id?: string };

async function parseMunicipio(formData: FormData, prefix: "origem" | "destino") {
  const ibge = (formData.get(`${prefix}_ibge`) as string) || null;
  if (!ibge) {
    return {
      campos: {
        [`${prefix}_cidade`]: null,
        [`${prefix}_uf`]: null,
        [`${prefix}_ibge`]: null,
        [`${prefix}_lat`]: null,
        [`${prefix}_lon`]: null,
      },
      ponto: null as PontoRota | null,
    };
  }

  const cidade = (formData.get(`${prefix}_cidade`) as string) || null;
  const uf = (formData.get(`${prefix}_uf`) as string) || null;
  let lat = parseFloat((formData.get(`${prefix}_lat`) as string) || "");
  let lon = parseFloat((formData.get(`${prefix}_lon`) as string) || "");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const coords = await getCoordsComFallback(ibge, cidade ?? "", uf ?? "");
    lat = coords?.lat ?? NaN;
    lon = coords?.lon ?? NaN;
  }

  return {
    campos: {
      [`${prefix}_cidade`]: cidade,
      [`${prefix}_uf`]: uf,
      [`${prefix}_ibge`]: ibge,
      [`${prefix}_lat`]: Number.isFinite(lat) ? lat : null,
      [`${prefix}_lon`]: Number.isFinite(lon) ? lon : null,
    },
    ponto: Number.isFinite(lat) && Number.isFinite(lon) ? { ibge, lat, lon } : null,
  };
}

async function rotaEntreMunicipios(
  origem: { ponto: PontoRota | null },
  destino: { ponto: PontoRota | null },
) {
  if (!origem.ponto || !destino.ponto) return null;
  return getRota(origem.ponto, destino.ponto);
}

async function buildPayload(formData: FormData) {
  const valor = parseValor(String(formData.get("valor") ?? "0"));
  if (valor === null) return null;

  const [origemMunicipio, destinoMunicipio] = await Promise.all([
    parseMunicipio(formData, "origem"),
    parseMunicipio(formData, "destino"),
  ]);

  const rota = await rotaEntreMunicipios(origemMunicipio, destinoMunicipio);

  return {
    cliente_id: (formData.get("cliente_id") as string) || null,
    motorista_id: (formData.get("motorista_id") as string) || null,
    veiculo_id: (formData.get("veiculo_id") as string) || null,
    origem: (formData.get("origem") as string) || null,
    destino: (formData.get("destino") as string) || null,
    ...origemMunicipio.campos,
    ...destinoMunicipio.campos,
    distancia_km: rota?.distanciaKm ?? null,
    pedagio_estimado: rota?.pedagioEstimado ?? null,
    valor,
    status: (formData.get("status") as string) || "agendada",
    data: (formData.get("data") as string) || new Date().toISOString().slice(0, 10),
    observacoes: (formData.get("observacoes") as string) || null,
  };
}

export type SugestaoRota = {
  distanciaKm: number;
  duracaoMin: number;
  pedagioEstimado: number | null;
  precoSugerido: number;
};

export async function sugerirRota(
  origem: PontoRota,
  destino: PontoRota,
): Promise<SugestaoRota | null> {
  const rota = await getRota(origem, destino);
  if (!rota) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tarifaKm = 5;
  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("id", user.id)
      .single();
    if (usuario) {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("tarifa_km_padrao")
        .eq("id", usuario.empresa_id)
        .single();
      if (empresa) tarifaKm = empresa.tarifa_km_padrao;
    }
  }

  const precoSugerido =
    Math.round((rota.distanciaKm * tarifaKm + (rota.pedagioEstimado ?? 0)) * 100) / 100;

  return {
    distanciaKm: rota.distanciaKm,
    duracaoMin: rota.duracaoMin,
    pedagioEstimado: rota.pedagioEstimado,
    precoSugerido,
  };
}

export async function createViagem(
  _prev: ViagemFormState,
  formData: FormData,
): Promise<ViagemFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .single();
  if (!usuario) return { error: "Usuário sem empresa vinculada." };

  const payload = await buildPayload(formData);
  if (!payload) return { error: "Valor inválido." };

  const { data: viagem, error } = await supabase
    .from("viagens")
    .insert({ ...payload, empresa_id: usuario.empresa_id })
    .select("id")
    .single();

  if (error || !viagem) return { error: "Não foi possível salvar a viagem." };

  revalidatePath("/viagens");
  return { success: true, id: viagem.id };
}

export async function updateViagem(
  id: string,
  _prev: ViagemFormState,
  formData: FormData,
): Promise<ViagemFormState> {
  const supabase = await createClient();

  const payload = await buildPayload(formData);
  if (!payload) return { error: "Valor inválido." };

  const { error } = await supabase.from("viagens").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar a viagem." };

  revalidatePath("/viagens");
  revalidatePath(`/viagens/${id}`);
  return { success: true, id };
}

export async function updateViagemStatus(id: string, formData: FormData) {
  const status = formData.get("status") as ViagemStatus;
  const supabase = await createClient();

  const { data: viagem } = await supabase
    .from("viagens")
    .select("empresa_id, status, valor, origem, destino, data")
    .eq("id", id)
    .single();

  await supabase.from("viagens").update({ status }).eq("id", id);

  if (viagem && status !== viagem.status) {
    if (status === "concluida") {
      await gerarLancamentoConclusao(supabase, id, viagem);
    } else if (viagem.status === "concluida") {
      await supabase
        .from("lancamentos_financeiros")
        .delete()
        .eq("viagem_id", id)
        .eq("origem", "viagem");
    }
  }

  revalidatePath("/viagens");
  revalidatePath(`/viagens/${id}`);
  revalidatePath("/financeiro");
  revalidatePath("/");
}

async function gerarLancamentoConclusao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viagemId: string,
  viagem: { empresa_id: string; valor: number; origem: string | null; destino: string | null; data: string },
) {
  const { count } = await supabase
    .from("lancamentos_financeiros")
    .select("id", { count: "exact", head: true })
    .eq("viagem_id", viagemId)
    .eq("origem", "viagem");

  if (count) return;

  await supabase.from("lancamentos_financeiros").insert({
    empresa_id: viagem.empresa_id,
    viagem_id: viagemId,
    tipo: "receita",
    categoria: "Frete",
    valor: viagem.valor,
    descricao: `Viagem concluída - ${viagem.origem ?? "?"} → ${viagem.destino ?? "?"}`,
    data: viagem.data,
    origem: "viagem",
  });
}

export async function deleteViagem(id: string) {
  const supabase = await createClient();
  await supabase.from("viagens").delete().eq("id", id);

  revalidatePath("/viagens");
  redirect("/viagens");
}
