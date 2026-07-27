import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManutencaoForm } from "@/components/frota/manutencao-form";
import { createClient } from "@/lib/supabase/server";
import type { ManutencaoFrota } from "@/lib/types";
import { updateManutencao } from "../../actions";

export default async function EditarManutencaoPage({
  params,
}: {
  params: Promise<{ id: string; manutencaoId: string }>;
}) {
  const { id, manutencaoId } = await params;
  const supabase = await createClient();

  const { data: manutencao } = await supabase
    .from("manutencoes_frota")
    .select("id, veiculo_id, tipo, data_realizada, data_proxima, custo, observacoes, created_at")
    .eq("id", manutencaoId)
    .maybeSingle<ManutencaoFrota>();

  if (!manutencao) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar manutenção
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          <ManutencaoForm
            action={updateManutencao.bind(null, manutencaoId, id)}
            manutencao={manutencao}
            redirectTo={`/frota/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
