import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ViagemForm } from "@/components/viagens/viagem-form";
import { createClient } from "@/lib/supabase/server";
import { createViagem } from "../actions";

export default async function NovaViagemPage() {
  const supabase = await createClient();

  const [{ data: clientes }, { data: motoristas }, { data: veiculos }] = await Promise.all([
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("veiculos_frota").select("id, placa, modelo").order("placa"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Nova viagem
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre um novo serviço de guincho.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da viagem</CardTitle>
        </CardHeader>
        <CardContent>
          <ViagemForm
            action={createViagem}
            clientes={clientes ?? []}
            motoristas={motoristas ?? []}
            veiculos={veiculos ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
