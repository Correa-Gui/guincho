import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarMensagemTexto } from "./evolution";
import { formatCurrency, formatDate } from "@/lib/format";

type LancamentoDoDia = { tipo: "receita" | "despesa"; categoria: string; valor: number };
type ViagemDoDia = { valor: number };
type ContaAtrasada = { valor: number };
type Destinatario = { numero: string };

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function numeroParaJid(numero: string): string {
  const digits = numero.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

async function montarResumo(supabase: SupabaseClient, empresaId: string, dataStr: string) {
  const [{ data: lancamentos }, { data: viagensConcluidas }, { data: contasAtrasadas }] =
    await Promise.all([
      supabase
        .from("lancamentos_financeiros")
        .select("tipo, categoria, valor")
        .eq("empresa_id", empresaId)
        .eq("data", dataStr)
        .returns<LancamentoDoDia[]>(),
      supabase
        .from("viagens")
        .select("valor")
        .eq("empresa_id", empresaId)
        .eq("data", dataStr)
        .eq("status", "concluida")
        .returns<ViagemDoDia[]>(),
      supabase
        .from("contas_a_receber")
        .select("valor")
        .eq("empresa_id", empresaId)
        .eq("status", "atrasado")
        .returns<ContaAtrasada[]>(),
    ]);

  const itens = lancamentos ?? [];
  const receitas = itens.filter((l) => l.tipo === "receita").reduce((t, l) => t + l.valor, 0);
  const despesas = itens.filter((l) => l.tipo === "despesa").reduce((t, l) => t + l.valor, 0);

  const porCategoria = new Map<string, number>();
  for (const item of itens) {
    if (item.tipo !== "despesa") continue;
    porCategoria.set(item.categoria, (porCategoria.get(item.categoria) ?? 0) + item.valor);
  }
  const despesasPorCategoria = Array.from(porCategoria, ([categoria, valor]) => ({
    categoria,
    valor,
  })).sort((a, b) => b.valor - a.valor);

  const viagens = viagensConcluidas ?? [];
  const atrasadas = contasAtrasadas ?? [];

  return {
    saldo: receitas - despesas,
    receitas,
    despesas,
    despesasPorCategoria,
    qtdViagens: viagens.length,
    valorViagens: viagens.reduce((t, v) => t + v.valor, 0),
    qtdAtrasadas: atrasadas.length,
    valorAtrasado: atrasadas.reduce((t, c) => t + c.valor, 0),
  };
}

function formatarMensagem(resumo: Awaited<ReturnType<typeof montarResumo>>, data: Date): string {
  const linhas = [
    `*Resumo do dia — ${formatDate(data)}*`,
    "",
    `Saldo do dia: *${formatCurrency(resumo.saldo)}*`,
    `Receitas: ${formatCurrency(resumo.receitas)}`,
    `Despesas: ${formatCurrency(resumo.despesas)}`,
  ];

  if (resumo.despesasPorCategoria.length > 0) {
    linhas.push("", "Despesas por categoria:");
    for (const item of resumo.despesasPorCategoria) {
      linhas.push(`• ${item.categoria}: ${formatCurrency(item.valor)}`);
    }
  }

  linhas.push("", `Viagens concluídas: ${resumo.qtdViagens} (${formatCurrency(resumo.valorViagens)})`);

  if (resumo.qtdAtrasadas > 0) {
    linhas.push(
      "",
      `⚠️ Contas atrasadas: ${resumo.qtdAtrasadas} (${formatCurrency(resumo.valorAtrasado)})`,
    );
  }

  return linhas.join("\n");
}

/** Monta e envia o resumo diário aos destinatários ativos de uma empresa. */
export async function enviarRelatorioDiarioEmpresa(
  supabase: SupabaseClient,
  empresaId: string,
  data: Date = new Date(),
): Promise<{ enviados: number }> {
  const { data: destinatarios } = await supabase
    .from("relatorio_diario_destinatarios")
    .select("numero")
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .returns<Destinatario[]>();

  const lista = destinatarios ?? [];
  if (lista.length === 0) return { enviados: 0 };

  const resumo = await montarResumo(supabase, empresaId, toISODate(data));
  const texto = formatarMensagem(resumo, data);

  await Promise.all(lista.map((d) => enviarMensagemTexto(numeroParaJid(d.numero), texto)));

  return { enviados: lista.length };
}

/** Roda o envio do resumo diário para todas as empresas com destinatários ativos (uso do cron). */
export async function enviarRelatoriosDiariosTodasEmpresas(
  supabase: SupabaseClient,
  data: Date = new Date(),
): Promise<{ empresas: number; enviados: number }> {
  const { data: ativos } = await supabase
    .from("relatorio_diario_destinatarios")
    .select("empresa_id")
    .eq("ativo", true);

  const empresaIds = Array.from(new Set((ativos ?? []).map((d) => d.empresa_id as string)));

  let enviados = 0;
  for (const empresaId of empresaIds) {
    const resultado = await enviarRelatorioDiarioEmpresa(supabase, empresaId, data);
    enviados += resultado.enviados;
  }

  return { empresas: empresaIds.length, enviados };
}
