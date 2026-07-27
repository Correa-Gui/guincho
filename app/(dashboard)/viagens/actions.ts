"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseValor } from "@/lib/parse";
import { validarPlaca } from "@/lib/format";
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
    segurado: (formData.get("segurado") as string) || null,
    placa_cliente: placaClienteNormalizada(formData.get("placa_cliente") as string | null),
  };
}

/** Normaliza a placa digitada (maiúscula, sem espaço/hífen); não bloqueia se o formato não bater. */
function placaClienteNormalizada(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  return validarPlaca(raw).normalizada;
}

export type SugestaoRota = {
  distanciaKm: number;
  duracaoMin: number;
  pedagioEstimado: number | null;
  saidaBaseKm: number | null;
  saidaBaseDuracaoMin: number | null;
  pedagioSaidaEstimado: number | null;
  retornoKm: number | null;
  retornoDuracaoMin: number | null;
  pedagioRetornoEstimado: number | null;
  distanciaTotalKm: number;
  custoCombustivelEstimado: number | null;
  precoSugerido: number;
};

export async function sugerirRota(
  origem: PontoRota,
  destino: PontoRota,
  veiculoId?: string | null,
): Promise<SugestaoRota | null> {
  const rota = await getRota(origem, destino);
  if (!rota) return null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tarifaKm = 5;
  let precoCombustivel = 6;
  let saidaBaseKm: number | null = null;
  let saidaBaseDuracaoMin: number | null = null;
  let pedagioSaidaEstimado: number | null = null;
  let retornoKm: number | null = null;
  let retornoDuracaoMin: number | null = null;
  let pedagioRetornoEstimado: number | null = null;

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("empresa_id")
      .eq("id", user.id)
      .single();
    if (usuario) {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("tarifa_km_padrao, preco_combustivel_padrao, base_ibge, base_lat, base_lon")
        .eq("id", usuario.empresa_id)
        .single();
      if (empresa) {
        tarifaKm = empresa.tarifa_km_padrao;
        precoCombustivel = empresa.preco_combustivel_padrao;

        if (empresa.base_ibge && empresa.base_lat != null && empresa.base_lon != null) {
          const base: PontoRota = {
            ibge: empresa.base_ibge,
            lat: empresa.base_lat,
            lon: empresa.base_lon,
          };

          const [saida, retorno] = await Promise.all([
            getRota(base, origem),
            getRota(destino, base),
          ]);

          if (saida) {
            saidaBaseKm = saida.distanciaKm;
            saidaBaseDuracaoMin = saida.duracaoMin;
            pedagioSaidaEstimado = saida.pedagioEstimado;
          }
          if (retorno) {
            retornoKm = retorno.distanciaKm;
            retornoDuracaoMin = retorno.duracaoMin;
            pedagioRetornoEstimado = retorno.pedagioEstimado;
          }
        }
      }
    }
  }

  const distanciaTotalKm =
    Math.round((rota.distanciaKm + (saidaBaseKm ?? 0) + (retornoKm ?? 0)) * 10) / 10;

  let custoCombustivelEstimado: number | null = null;
  if (veiculoId) {
    const { data: veiculo } = await supabase
      .from("veiculos_frota")
      .select("consumo_kml, tarifa_km")
      .eq("id", veiculoId)
      .single();
    if (veiculo?.consumo_kml) {
      custoCombustivelEstimado =
        Math.round((distanciaTotalKm / veiculo.consumo_kml) * precoCombustivel * 100) / 100;
    }
    if (veiculo?.tarifa_km) {
      tarifaKm = veiculo.tarifa_km;
    }
  }

  const precoSugerido =
    Math.round(
      (rota.distanciaKm * tarifaKm +
        (rota.pedagioEstimado ?? 0) +
        (pedagioSaidaEstimado ?? 0) +
        (pedagioRetornoEstimado ?? 0) +
        (custoCombustivelEstimado ?? 0)) *
        100,
    ) / 100;

  return {
    distanciaKm: rota.distanciaKm,
    duracaoMin: rota.duracaoMin,
    pedagioEstimado: rota.pedagioEstimado,
    saidaBaseKm,
    saidaBaseDuracaoMin,
    pedagioSaidaEstimado,
    retornoKm,
    retornoDuracaoMin,
    pedagioRetornoEstimado,
    distanciaTotalKm,
    custoCombustivelEstimado,
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

  const { data: viagemAtual } = await supabase
    .from("viagens")
    .select("empresa_id, status, valor, origem, destino, data")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("viagens").update(payload).eq("id", id);
  if (error) return { error: "Não foi possível salvar a viagem." };

  if (viagemAtual && payload.status !== viagemAtual.status) {
    await sincronizarLancamentoStatus(supabase, id, payload.status as ViagemStatus, {
      ...viagemAtual,
      valor: payload.valor,
      origem: payload.origem,
      destino: payload.destino,
      data: payload.data,
      motorista_id: payload.motorista_id,
    });
  }

  revalidatePath("/viagens");
  revalidatePath(`/viagens/${id}`);
  revalidatePath("/financeiro");
  revalidatePath("/");
  return { success: true, id };
}

export async function updateViagemStatus(id: string, formData: FormData) {
  const status = formData.get("status") as ViagemStatus;
  const supabase = await createClient();

  const { data: viagem } = await supabase
    .from("viagens")
    .select("empresa_id, status, valor, origem, destino, data, motorista_id")
    .eq("id", id)
    .single();

  await supabase.from("viagens").update({ status }).eq("id", id);

  if (viagem && status !== viagem.status) {
    await sincronizarLancamentoStatus(supabase, id, status, viagem);
  }

  revalidatePath("/viagens");
  revalidatePath(`/viagens/${id}`);
  revalidatePath("/financeiro");
  revalidatePath("/");
}

async function sincronizarLancamentoStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viagemId: string,
  novoStatus: ViagemStatus,
  viagem: {
    empresa_id: string;
    status: ViagemStatus;
    valor: number;
    origem: string | null;
    destino: string | null;
    data: string;
    motorista_id: string | null;
  },
) {
  if (novoStatus === "concluida") {
    await gerarLancamentoConclusao(supabase, viagemId, viagem);
  } else if (viagem.status === "concluida") {
    await supabase
      .from("lancamentos_financeiros")
      .delete()
      .eq("viagem_id", viagemId)
      .eq("origem", "viagem");
  }
}

async function gerarLancamentoConclusao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viagemId: string,
  viagem: {
    empresa_id: string;
    valor: number;
    origem: string | null;
    destino: string | null;
    data: string;
    motorista_id: string | null;
  },
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
    motorista_id: viagem.motorista_id,
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
