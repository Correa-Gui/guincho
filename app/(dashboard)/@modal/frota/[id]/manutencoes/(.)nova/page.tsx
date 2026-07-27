import { Modal } from "@/components/shared/modal";
import { ManutencaoForm } from "@/components/frota/manutencao-form";
import { createManutencao } from "@/app/(dashboard)/frota/[id]/manutencoes/actions";

export default async function NovaManutencaoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Modal title="Nova manutenção" description="Registre uma manutenção do veículo." className="sm:max-w-2xl">
      <ManutencaoForm action={createManutencao.bind(null, id)} redirectTo={`/frota/${id}`} />
    </Modal>
  );
}
