import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VeiculoForm } from "@/components/frota/veiculo-form";
import { createClient } from "@/lib/supabase/server";
import type { VeiculoFrotaCompleto } from "@/lib/types";
import { updateVeiculo } from "../../actions";

export default async function EditarVeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: veiculo } = await supabase
    .from("veiculos_frota")
    .select("id, placa, modelo, ano, status, consumo_kml, tarifa_km, created_at")
    .eq("id", id)
    .maybeSingle<VeiculoFrotaCompleto>();

  if (!veiculo) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar veículo
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do veículo</CardTitle>
        </CardHeader>
        <CardContent>
          <VeiculoForm action={updateVeiculo.bind(null, id)} veiculo={veiculo} />
        </CardContent>
      </Card>
    </div>
  );
}
