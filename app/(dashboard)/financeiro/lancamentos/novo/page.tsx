import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LancamentoForm } from "@/components/financeiro/lancamento-form";
import { createClient } from "@/lib/supabase/server";
import { createLancamento } from "../../actions";

export default async function NovoLancamentoPage() {
  const supabase = await createClient();

  const [{ data: viagens }, { data: motoristas }] = await Promise.all([
    supabase.from("viagens").select("id, origem, destino").order("data", { ascending: false }),
    supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Novo lançamento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registre uma receita ou despesa.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          <LancamentoForm action={createLancamento} viagens={viagens ?? []} motoristas={motoristas ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
