import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManutencaoForm } from "@/components/frota/manutencao-form";
import { createManutencao } from "../actions";

export default async function NovaManutencaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Nova manutenção
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Registre uma manutenção do veículo.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          <ManutencaoForm action={createManutencao.bind(null, id)} redirectTo={`/frota/${id}`} />
        </CardContent>
      </Card>
    </div>
  );
}
