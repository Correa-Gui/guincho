import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContaFixaForm } from "@/components/financeiro/conta-fixa-form";
import { createClient } from "@/lib/supabase/server";
import type { ContaFixa } from "@/lib/types";
import { updateContaFixa } from "../../../actions";

export default async function EditarContaFixaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contaFixa } = await supabase
    .from("contas_fixas")
    .select("id, descricao, tipo, categoria, valor, dia_vencimento, ativo, created_at")
    .eq("id", id)
    .maybeSingle<ContaFixa>();

  if (!contaFixa) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar conta fixa
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da conta fixa</CardTitle>
        </CardHeader>
        <CardContent>
          <ContaFixaForm action={updateContaFixa.bind(null, id)} contaFixa={contaFixa} />
        </CardContent>
      </Card>
    </div>
  );
}
