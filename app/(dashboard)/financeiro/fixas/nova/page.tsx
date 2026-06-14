import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContaFixaForm } from "@/components/financeiro/conta-fixa-form";
import { createContaFixa } from "../../actions";

export default function NovaContaFixaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Nova conta fixa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Despesas e receitas recorrentes que se repetem todo mês.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da conta fixa</CardTitle>
        </CardHeader>
        <CardContent>
          <ContaFixaForm action={createContaFixa} />
        </CardContent>
      </Card>
    </div>
  );
}
