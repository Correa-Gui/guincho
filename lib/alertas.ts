import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCurrency, formatDate } from "@/lib/format";
import { DOCUMENTO_TIPO_LABEL, MANUTENCAO_TIPO_LABEL } from "@/lib/types";

const PATIO_DIAS_LIMITE = 3;
const DOCUMENTO_DIAS_ALERTA = 30;
const MANUTENCAO_DIAS_ALERTA = 15;

type ContaAtrasada = {
  id: string;
  valor: number;
  vencimento: string;
  clientes: { nome: string } | null;
};

type PatioParado = {
  id: string;
  veiculo_placa: string;
  entrada: string;
};

type ViagemAtrasada = {
  id: string;
  origem: string | null;
  destino: string | null;
  data: string;
  clientes: { nome: string } | null;
};

type DocumentoProximo = {
  id: string;
  tipo: keyof typeof DOCUMENTO_TIPO_LABEL;
  vencimento: string;
  veiculos_frota: { placa: string } | null;
};

type ManutencaoProxima = {
  id: string;
  tipo: keyof typeof MANUTENCAO_TIPO_LABEL;
  data_proxima: string;
  veiculos_frota: { placa: string } | null;
};

type AlertaCandidato = {
  empresa_id: string;
  tipo: string;
  mensagem: string;
  referencia_tipo: string;
  referencia_id: string;
};

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Gera alertas automáticos para contas a receber vencidas, veículos parados
 * no pátio há muito tempo e viagens atrasadas. Idempotente — usa
 * `(empresa_id, referencia_tipo, referencia_id)` para não duplicar alertas.
 */
export async function gerarAlertasAutomaticos(supabase: SupabaseClient): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .single();

  const empresaId = usuario?.empresa_id;
  if (!empresaId) return;

  const hoje = new Date();
  const hojeStr = toISODate(hoje);
  const limitePatio = new Date(hoje);
  limitePatio.setDate(limitePatio.getDate() - PATIO_DIAS_LIMITE);
  const limiteDocumento = new Date(hoje);
  limiteDocumento.setDate(limiteDocumento.getDate() + DOCUMENTO_DIAS_ALERTA);
  const limiteManutencao = new Date(hoje);
  limiteManutencao.setDate(limiteManutencao.getDate() + MANUTENCAO_DIAS_ALERTA);

  const [
    { data: contasVencidas },
    { data: veiculosParados },
    { data: viagensAtrasadas },
    { data: documentosProximos },
    { data: manutencoesProximas },
  ] = await Promise.all([
    supabase
      .from("contas_a_receber")
      .select("id, valor, vencimento, clientes(nome)")
      .in("status", ["pendente", "atrasado"])
      .lt("vencimento", hojeStr)
      .returns<ContaAtrasada[]>(),
    supabase
      .from("patio")
      .select("id, veiculo_placa, entrada")
      .eq("status", "no_patio")
      .lt("entrada", limitePatio.toISOString())
      .returns<PatioParado[]>(),
    supabase
      .from("viagens")
      .select("id, origem, destino, data, clientes(nome)")
      .in("status", ["agendada", "em_andamento"])
      .lt("data", hojeStr)
      .returns<ViagemAtrasada[]>(),
    supabase
      .from("documentos_frota")
      .select("id, tipo, vencimento, veiculos_frota(placa)")
      .lte("vencimento", toISODate(limiteDocumento))
      .returns<DocumentoProximo[]>(),
    supabase
      .from("manutencoes_frota")
      .select("id, tipo, data_proxima, veiculos_frota(placa)")
      .not("data_proxima", "is", null)
      .lte("data_proxima", toISODate(limiteManutencao))
      .returns<ManutencaoProxima[]>(),
  ]);

  const idsParaAtrasar = (contasVencidas ?? [])
    .map((conta) => conta.id);
  if (idsParaAtrasar.length > 0) {
    await supabase
      .from("contas_a_receber")
      .update({ status: "atrasado" })
      .in("id", idsParaAtrasar)
      .eq("status", "pendente");
  }

  const candidatos: AlertaCandidato[] = [
    ...(contasVencidas ?? []).map((conta) => ({
      empresa_id: empresaId,
      tipo: "conta_atrasada",
      mensagem: `Conta a receber de ${conta.clientes?.nome ?? "cliente"} no valor de ${formatCurrency(conta.valor)} venceu em ${formatDate(conta.vencimento)}.`,
      referencia_tipo: "conta_a_receber",
      referencia_id: conta.id,
    })),
    ...(veiculosParados ?? []).map((patio) => ({
      empresa_id: empresaId,
      tipo: "patio_prolongado",
      mensagem: `Veículo ${patio.veiculo_placa} está no pátio há mais de ${PATIO_DIAS_LIMITE} dias (entrada em ${formatDate(patio.entrada)}).`,
      referencia_tipo: "patio",
      referencia_id: patio.id,
    })),
    ...(viagensAtrasadas ?? []).map((viagem) => ({
      empresa_id: empresaId,
      tipo: "viagem_atrasada",
      mensagem: `Viagem de ${viagem.clientes?.nome ?? "cliente"} (${viagem.origem ?? "?"} → ${viagem.destino ?? "?"}) estava agendada para ${formatDate(viagem.data)} e ainda não foi concluída.`,
      referencia_tipo: "viagem",
      referencia_id: viagem.id,
    })),
    ...(documentosProximos ?? []).map((documento) => {
      const vencido = documento.vencimento < hojeStr;
      return {
        empresa_id: empresaId,
        tipo: vencido ? "documento_vencido" : "documento_vencendo",
        mensagem: `${DOCUMENTO_TIPO_LABEL[documento.tipo]} do veículo ${documento.veiculos_frota?.placa ?? "—"} ${vencido ? "venceu em" : "vence em"} ${formatDate(documento.vencimento)}.`,
        referencia_tipo: "documento_frota",
        referencia_id: documento.id,
      };
    }),
    ...(manutencoesProximas ?? []).map((manutencao) => {
      const vencida = manutencao.data_proxima < hojeStr;
      return {
        empresa_id: empresaId,
        tipo: vencida ? "manutencao_vencida" : "manutencao_proxima",
        mensagem: `${MANUTENCAO_TIPO_LABEL[manutencao.tipo]} do veículo ${manutencao.veiculos_frota?.placa ?? "—"} ${vencida ? "venceu em" : "prevista para"} ${formatDate(manutencao.data_proxima)}.`,
        referencia_tipo: "manutencao_frota",
        referencia_id: manutencao.id,
      };
    }),
  ];

  if (candidatos.length === 0) return;

  await supabase
    .from("alertas")
    .upsert(candidatos, {
      onConflict: "empresa_id,referencia_tipo,referencia_id",
      ignoreDuplicates: true,
    });
}
