import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentoForm } from "@/components/frota/documento-form";
import { createClient } from "@/lib/supabase/server";
import type { DocumentoFrota } from "@/lib/types";
import { updateDocumento } from "../../actions";

export default async function EditarDocumentoPage({
  params,
}: {
  params: Promise<{ id: string; documentoId: string }>;
}) {
  const { id, documentoId } = await params;
  const supabase = await createClient();

  const { data: documento } = await supabase
    .from("documentos_frota")
    .select("id, veiculo_id, tipo, numero, vencimento, observacoes, created_at")
    .eq("id", documentoId)
    .maybeSingle<DocumentoFrota>();

  if (!documento) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Editar documento
        </h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do documento</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentoForm
            action={updateDocumento.bind(null, documentoId, id)}
            documento={documento}
            redirectTo={`/frota/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
