import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViagemForm } from "@/components/viagens/viagem-form";
import { createClient } from "@/lib/supabase/server";
import type { Viagem } from "@/lib/types";
import { updateViagem } from "../../actions";

export default async function EditarViagemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: viagem }, { data: motoristas }, { data: veiculos }] =
    await Promise.all([
      supabase
        .from("viagens")
        .select(
          "id, cliente_id, motorista_id, veiculo_id, origem, destino, origem_cidade, origem_uf, origem_ibge, origem_lat, origem_lon, destino_cidade, destino_uf, destino_ibge, destino_lat, destino_lon, valor, status, data, observacoes, segurado, seguradora, placa_cliente, clientes(nome), motoristas(nome), veiculos_frota(placa, modelo)",
        )
        .eq("id", id)
        .maybeSingle<Viagem>(),
      supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("veiculos_frota").select("id, placa, modelo").order("placa"),
    ]);

  if (!viagem) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar viagem
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da viagem</CardTitle>
        </CardHeader>
        <CardContent>
          <ViagemForm
            action={updateViagem.bind(null, id)}
            viagem={viagem}
            motoristas={motoristas ?? []}
            veiculos={veiculos ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
