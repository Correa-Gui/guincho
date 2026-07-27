import { Modal } from "@/components/shared/modal";
import { DocumentoForm } from "@/components/frota/documento-form";
import { createDocumento } from "@/app/(dashboard)/frota/[id]/documentos/actions";

export default async function NovoDocumentoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Modal title="Novo documento" description="Cadastre um documento do veículo." className="sm:max-w-2xl">
      <DocumentoForm action={createDocumento.bind(null, id)} redirectTo={`/frota/${id}`} />
    </Modal>
  );
}
