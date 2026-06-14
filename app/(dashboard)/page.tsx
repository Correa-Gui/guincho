import Link from "next/link";
import { Wallet, HandCoins, TrendingUp, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/dashboard/kpi-card";
import { PanelCard } from "@/components/dashboard/panel-card";
import { CashFlowChart, type CashFlowPoint } from "@/components/dashboard/cash-flow-chart";
import { createClient } from "@/lib/supabase/server";
import { gerarLancamentosDoMes } from "@/lib/contas-fixas";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import {
  CONTA_STATUS_BADGE_CLASS,
  CONTA_STATUS_LABEL,
  VIAGEM_STATUS_BADGE_CLASS,
  VIAGEM_STATUS_LABEL,
  type Alerta,
} from "@/lib/types";

type Lancamento = { tipo: "receita" | "despesa"; valor: number; data: string };
type ContaProxima = {
  id: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "pago" | "atrasado";
  clientes: { nome: string } | null;
};
type ViagemRecente = {
  id: string;
  data: string;
  valor: number;
  status: "agendada" | "em_andamento" | "concluida" | "cancelada";
  clientes: { nome: string } | null;
};

function sumLancamentos(lancamentos: { tipo: "receita" | "despesa"; valor: number }[]) {
  return lancamentos.reduce(
    (total, lancamento) =>
      lancamento.tipo === "receita" ? total + lancamento.valor : total - lancamento.valor,
    0,
  );
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date);
  return (label.charAt(0).toUpperCase() + label.slice(1)).replace(".", "");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nome = user?.email?.split("@")[0] ?? "";

  await gerarLancamentosDoMes(supabase);

  const hoje = new Date();
  const hojeStr = toISODate(hoje);
  const inicioMesDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesAnteriorDate = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const inicioJanelaDate = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
  const inicioMes = toISODate(inicioMesDate);
  const inicioMesAnterior = toISODate(inicioMesAnteriorDate);
  const inicioJanela = toISODate(inicioJanelaDate);

  const [
    { data: lancamentosJanela },
    { data: lancamentosTotais },
    { data: contasPendentes },
    { count: viagensHoje },
    { count: viagensEmAndamento },
    { data: ultimasViagens },
    { data: alertasRecentes },
  ] = await Promise.all([
    supabase
      .from("lancamentos_financeiros")
      .select("tipo, valor, data")
      .gte("data", inicioJanela)
      .lte("data", hojeStr)
      .returns<Lancamento[]>(),
    supabase
      .from("lancamentos_financeiros")
      .select("tipo, valor")
      .returns<{ tipo: "receita" | "despesa"; valor: number }[]>(),
    supabase
      .from("contas_a_receber")
      .select("id, valor, vencimento, status, clientes(nome)")
      .in("status", ["pendente", "atrasado"])
      .order("vencimento", { ascending: true })
      .returns<ContaProxima[]>(),
    supabase.from("viagens").select("id", { count: "exact", head: true }).eq("data", hojeStr),
    supabase
      .from("viagens")
      .select("id", { count: "exact", head: true })
      .eq("status", "em_andamento"),
    supabase
      .from("viagens")
      .select("id, data, valor, status, clientes(nome)")
      .order("data", { ascending: false })
      .limit(5)
      .returns<ViagemRecente[]>(),
    supabase
      .from("alertas")
      .select("id, tipo, mensagem, lido, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Alerta[]>(),
  ]);

  const lancamentos = lancamentosJanela ?? [];
  const caixaDoMes = sumLancamentos(lancamentos.filter((l) => l.data >= inicioMes));
  const caixaMesAnterior = sumLancamentos(
    lancamentos.filter((l) => l.data >= inicioMesAnterior && l.data < inicioMes),
  );
  const lucroDoPeriodo = sumLancamentos(lancamentosTotais ?? []);
  const contasProximas = contasPendentes ?? [];
  const aReceber = contasProximas.reduce((total, conta) => total + conta.valor, 0);
  const atrasadas = contasProximas.filter((c) => c.status === "atrasado").length;

  let caixaContext = "Sem dados do mês anterior";
  let caixaTone: "pos" | "neg" | "neutral" = "neutral";
  if (caixaMesAnterior !== 0) {
    const variacao = ((caixaDoMes - caixaMesAnterior) / Math.abs(caixaMesAnterior)) * 100;
    caixaContext = `${variacao >= 0 ? "+" : ""}${variacao.toFixed(0)}% vs. mês anterior`;
    caixaTone = variacao >= 0 ? "pos" : "neg";
  }

  const chartData: CashFlowPoint[] = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(inicioJanelaDate.getFullYear(), inicioJanelaDate.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const doMes = lancamentos.filter((l) => l.data.slice(0, 7) === key);
    return {
      label: monthLabel(date),
      receita: doMes.filter((l) => l.tipo === "receita").reduce((t, l) => t + l.valor, 0),
      despesa: doMes.filter((l) => l.tipo === "despesa").reduce((t, l) => t + l.valor, 0),
    };
  });

  const kpis = [
    {
      label: "Caixa do mês",
      value: formatCurrency(caixaDoMes),
      icon: Wallet,
      context: caixaContext,
      contextTone: caixaTone,
    },
    {
      label: "A receber",
      value: formatCurrency(aReceber),
      icon: HandCoins,
      context:
        atrasadas > 0
          ? `${atrasadas} conta${atrasadas > 1 ? "s" : ""} atrasada${atrasadas > 1 ? "s" : ""}`
          : `${contasProximas.length} conta${contasProximas.length === 1 ? "" : "s"} pendente${contasProximas.length === 1 ? "" : "s"}`,
      contextTone: atrasadas > 0 ? "neg" : "neutral",
    },
    {
      label: "Lucro do período",
      value: formatCurrency(lucroDoPeriodo),
      icon: TrendingUp,
      context: "Acumulado desde o início",
      contextTone: "neutral",
    },
    {
      label: "Viagens hoje",
      value: String(viagensHoje ?? 0),
      icon: Truck,
      context: `${viagensEmAndamento ?? 0} em andamento`,
      contextTone: "neutral",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Início
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Olá, {nome}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.label}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            context={kpi.context}
            contextTone={kpi.contextTone}
          />
        ))}
      </div>

      <PanelCard title="Fluxo de caixa">
        <CashFlowChart data={chartData} />
      </PanelCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PanelCard title="Próximas a receber">
          {contasProximas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta pendente.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {contasProximas.slice(0, 5).map((conta) => (
                <li key={conta.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {conta.clientes?.nome ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Vence em {formatDate(conta.vencimento)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono tabular-nums text-foreground">
                      {formatCurrency(conta.valor)}
                    </span>
                    <Badge className={CONTA_STATUS_BADGE_CLASS[conta.status]}>
                      {CONTA_STATUS_LABEL[conta.status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title="Alertas"
          action={
            <Button variant="ghost" size="sm" render={<Link href="/alertas" />}>
              Ver todos
            </Button>
          }
        >
          {!alertasRecentes || alertasRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta recente.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {alertasRecentes.map((alerta) => (
                <li key={alerta.id} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${alerta.lido ? "bg-muted-foreground/30" : "bg-brand"}`}
                  />
                  <div className="flex flex-col">
                    <span className="text-foreground">{alerta.mensagem}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(alerta.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title="Últimas viagens">
          {!ultimasViagens || ultimasViagens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma viagem registrada.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {ultimasViagens.map((viagem) => (
                <li key={viagem.id}>
                  <Link
                    href={`/viagens/${viagem.id}`}
                    className="flex items-center justify-between gap-2 text-sm hover:text-brand-strong"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground group-hover:text-brand-strong">
                        {viagem.clientes?.nome ?? "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(viagem.data)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono tabular-nums text-foreground">
                        {formatCurrency(viagem.valor)}
                      </span>
                      <Badge className={VIAGEM_STATUS_BADGE_CLASS[viagem.status]}>
                        {VIAGEM_STATUS_LABEL[viagem.status]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
