"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

export type CashFlowPoint = {
  label: string;
  receita: number;
  despesa: number;
};

function CashFlowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const receita = payload.find((p) => p.name === "Receita")?.value ?? 0;
  const despesa = payload.find((p) => p.name === "Despesa")?.value ?? 0;
  const saldo = receita - despesa;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 text-sm font-medium text-foreground">{label}</p>
      {payload
        .filter((item) => item.name !== "Saldo")
        .map((item) => (
          <p key={item.name} className="flex justify-between gap-4" style={{ color: item.color }}>
            <span>{item.name}</span>
            <span className="font-mono">{formatCurrency(item.value)}</span>
          </p>
        ))}
      <div className="mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5">
        <span className="text-muted-foreground">Saldo</span>
        <span className={cn("font-mono font-medium", saldo >= 0 ? "text-pos" : "text-neg")}>
          {formatCurrency(saldo)}
        </span>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function compactBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  const chartData = data.map((d) => ({ ...d, saldo: d.receita - d.despesa }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 24, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={compactBRL}
          />
          <Tooltip content={<CashFlowTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="receita" name="Receita" fill="var(--color-brand)" radius={[5, 5, 0, 0]} maxBarSize={36} />
          <Bar dataKey="despesa" name="Despesa" fill="var(--color-neg)" fillOpacity={0.55} radius={[5, 5, 0, 0]} maxBarSize={36} />
          <Line
            dataKey="saldo"
            name="Saldo"
            type="monotone"
            stroke="var(--foreground)"
            strokeWidth={2}
            strokeDasharray="2 4"
            dot={{ r: 3, fill: "var(--foreground)", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
