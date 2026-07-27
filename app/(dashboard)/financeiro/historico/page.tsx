import { Card, CardContent } from "@/components/ui/card";
import { PanelCard } from "@/components/dashboard/panel-card";
import { CashFlowChart, type CashFlowPoint } from "@/components/dashboard/cash-flow-chart";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

type Lancamento = { tipo: "receita" | "despesa"; valor: number; data: string };

type MesResumo = {
  key: string;
  label: string;
  receita: number;
  despesa: number;
  saldo: number;
};

const MESES = 12;

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(
    date,
  );
  return (label.charAt(0).toUpperCase() + label.slice(1)).replace(".", "");
}

export default async function HistoricoFinanceiroPage() {
  const supabase = await createClient();

  const hoje = new Date();
  const inicioJanelaDate = new Date(hoje.getFullYear(), hoje.getMonth() - (MESES - 1), 1);
  const inicioJanela = toISODate(inicioJanelaDate);
  const hojeStr = toISODate(hoje);

  const { data } = await supabase
    .from("lancamentos_financeiros")
    .select("tipo, valor, data")
    .gte("data", inicioJanela)
    .lte("data", hojeStr)
    .returns<Lancamento[]>();

  const lancamentos = data ?? [];

  const meses: MesResumo[] = Array.from({ length: MESES }, (_, i) => {
    const date = new Date(inicioJanelaDate.getFullYear(), inicioJanelaDate.getMonth() + i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const doMes = lancamentos.filter((l) => l.data.slice(0, 7) === key);
    const receita = doMes.filter((l) => l.tipo === "receita").reduce((t, l) => t + l.valor, 0);
    const despesa = doMes.filter((l) => l.tipo === "despesa").reduce((t, l) => t + l.valor, 0);
    return { key, label: monthLabel(date), receita, despesa, saldo: receita - despesa };
  });

  const chartData: CashFlowPoint[] = meses.map((m) => ({
    label: m.label,
    receita: m.receita,
    despesa: m.despesa,
  }));

  const totalReceita = meses.reduce((t, m) => t + m.receita, 0);
  const totalDespesa = meses.reduce((t, m) => t + m.despesa, 0);
  const totalSaldo = totalReceita - totalDespesa;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Histórico mensal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ganhos e perdas dos últimos {MESES} meses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Receitas</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-pos">
              {formatCurrency(totalReceita)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Despesas</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-neg">
              {formatCurrency(totalDespesa)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Saldo do período</span>
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${totalSaldo >= 0 ? "text-pos" : "text-neg"}`}
            >
              {formatCurrency(totalSaldo)}
            </span>
          </CardContent>
        </Card>
      </div>

      <PanelCard title="Fluxo de caixa">
        <CashFlowChart data={chartData} />
      </PanelCard>

      <PanelCard title="Por mês">
        {meses.every((m) => m.receita === 0 && m.despesa === 0) ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lançamento nos últimos {MESES} meses.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {[...meses].reverse().map((mes) => (
              <li key={mes.key} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-medium text-foreground">{mes.label}</span>
                <div className="flex items-center gap-6 font-mono tabular-nums">
                  <span className="text-pos">{formatCurrency(mes.receita)}</span>
                  <span className="text-neg">- {formatCurrency(mes.despesa)}</span>
                  <span
                    className={`w-28 text-right font-semibold ${mes.saldo >= 0 ? "text-pos" : "text-neg"}`}
                  >
                    {formatCurrency(mes.saldo)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
