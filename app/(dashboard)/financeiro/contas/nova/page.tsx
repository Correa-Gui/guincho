import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContaForm } from "@/components/financeiro/conta-form";
import { createClient } from "@/lib/supabase/server";
import { createConta } from "../../actions";

export default async function NovaContaPage() {
  const supabase = await createClient();

  const [{ data: clientes }, { data: viagens }] = await Promise.all([
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("viagens").select("id, origem, destino").order("data", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Nova conta a receber
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre um valor a receber de um cliente.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da conta</CardTitle>
        </CardHeader>
        <CardContent>
          <ContaForm action={createConta} clientes={clientes ?? []} viagens={viagens ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
