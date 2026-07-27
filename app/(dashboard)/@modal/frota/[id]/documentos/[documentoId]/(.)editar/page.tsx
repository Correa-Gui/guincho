import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { DocumentoForm } from "@/components/frota/documento-form";
import { createClient } from "@/lib/supabase/server";
import type { DocumentoFrota } from "@/lib/types";
import { updateDocumento } from "@/app/(dashboard)/frota/[id]/documentos/actions";

export default async function EditarDocumentoModal({
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
    <Modal title="Editar documento" className="sm:max-w-2xl">
      <DocumentoForm
        action={updateDocumento.bind(null, documentoId, id)}
        documento={documento}
        redirectTo={`/frota/${id}`}
      />
    </Modal>
  );
}
