import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MotoristaForm } from "@/components/motoristas/motorista-form";
import { createClient } from "@/lib/supabase/server";
import type { MotoristaCompleto } from "@/lib/types";
import { updateMotorista } from "../../actions";

export default async function EditarMotoristaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: motorista } = await supabase
    .from("motoristas")
    .select("id, nome, telefone, ativo, created_at")
    .eq("id", id)
    .maybeSingle<MotoristaCompleto>();

  if (!motorista) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar motorista
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do motorista</CardTitle>
        </CardHeader>
        <CardContent>
          <MotoristaForm action={updateMotorista.bind(null, id)} motorista={motorista} />
        </CardContent>
      </Card>
    </div>
  );
}
