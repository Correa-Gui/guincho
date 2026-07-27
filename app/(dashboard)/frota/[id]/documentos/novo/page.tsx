import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentoForm } from "@/components/frota/documento-form";
import { createDocumento } from "../actions";

export default async function NovoDocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Novo documento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastre um documento do veículo.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do documento</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentoForm action={createDocumento.bind(null, id)} redirectTo={`/frota/${id}`} />
        </CardContent>
      </Card>
    </div>
  );
}
