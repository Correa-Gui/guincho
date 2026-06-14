import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntradaForm } from "@/components/patio/entrada-form";
import { createEntrada } from "../actions";

export default function NovaEntradaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Nova entrada
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Registre a entrada de um veículo no pátio.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <EntradaForm action={createEntrada} />
        </CardContent>
      </Card>
    </div>
  );
}
