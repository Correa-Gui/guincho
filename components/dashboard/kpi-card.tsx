import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KPICard({
  icon: Icon,
  label,
  value,
  context,
  contextTone = "neutral",
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  context?: string;
  contextTone?: "pos" | "neg" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <Icon className="size-4.5 text-brand-strong" />
          </div>
        </div>
        <div className="font-mono text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
          {value}
        </div>
        {context ? (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              contextTone === "pos" && "text-pos",
              contextTone === "neg" && "text-neg",
            )}
          >
            {context}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
