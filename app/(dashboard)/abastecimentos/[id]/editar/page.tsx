import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AbastecimentoForm } from "@/components/abastecimentos/abastecimento-form";
import { createClient } from "@/lib/supabase/server";
import type { Abastecimento } from "@/lib/types";
import { updateAbastecimento } from "../../actions";

export default async function EditarAbastecimentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: abastecimento }, { data: veiculos }, { data: motoristas }] = await Promise.all([
    supabase
      .from("abastecimentos")
      .select(
        "id, veiculo_id, motorista_id, data, litros, valor_litro, valor_total, km_atual, posto, observacoes, lancamento_id, created_at, veiculos_frota(placa, modelo), motoristas(nome)",
      )
      .eq("id", id)
      .maybeSingle<Abastecimento>(),
    supabase.from("veiculos_frota").select("id, placa, modelo").order("placa"),
    supabase.from("motoristas").select("id, nome").order("nome"),
  ]);

  if (!abastecimento) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar abastecimento
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do abastecimento</CardTitle>
        </CardHeader>
        <CardContent>
          <AbastecimentoForm
            action={updateAbastecimento.bind(null, id)}
            abastecimento={abastecimento}
            veiculos={veiculos ?? []}
            motoristas={motoristas ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
