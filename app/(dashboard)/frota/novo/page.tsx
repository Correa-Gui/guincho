import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VeiculoForm } from "@/components/frota/veiculo-form";
import { createVeiculo } from "../actions";

export default function NovoVeiculoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Novo veículo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastre um veículo da frota.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <VeiculoForm action={createVeiculo} />
        </CardContent>
      </Card>
    </div>
  );
}
