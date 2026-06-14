import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContaForm } from "@/components/financeiro/conta-form";
import { createClient } from "@/lib/supabase/server";
import type { ContaAReceber } from "@/lib/types";
import { updateConta } from "../../../actions";

export default async function EditarContaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: conta }, { data: clientes }, { data: viagens }] = await Promise.all([
    supabase
      .from("contas_a_receber")
      .select("id, viagem_id, cliente_id, valor, vencimento, status, created_at, clientes(nome), viagens(id, origem, destino)")
      .eq("id", id)
      .maybeSingle<ContaAReceber>(),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("viagens").select("id, origem, destino").order("data", { ascending: false }),
  ]);

  if (!conta) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar conta a receber
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
        </CardHeader>
        <CardContent>
          <ContaForm
            action={updateConta.bind(null, id)}
            conta={conta}
            clientes={clientes ?? []}
            viagens={viagens ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
