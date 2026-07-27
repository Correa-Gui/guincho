import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LancamentoForm } from "@/components/financeiro/lancamento-form";
import { createClient } from "@/lib/supabase/server";
import type { LancamentoFinanceiro } from "@/lib/types";
import { updateLancamento } from "../../../actions";

export default async function EditarLancamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lancamento }, { data: viagens }, { data: motoristas }] = await Promise.all([
    supabase
      .from("lancamentos_financeiros")
      .select(
        "id, viagem_id, motorista_id, tipo, categoria, valor, descricao, data, created_at, viagens(id, origem, destino), motoristas(nome)",
      )
      .eq("id", id)
      .maybeSingle<LancamentoFinanceiro>(),
    supabase.from("viagens").select("id, origem, destino").order("data", { ascending: false }),
    supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  if (!lancamento) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar lançamento
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          <LancamentoForm
            action={updateLancamento.bind(null, id)}
            lancamento={lancamento}
            viagens={viagens ?? []}
            motoristas={motoristas ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
