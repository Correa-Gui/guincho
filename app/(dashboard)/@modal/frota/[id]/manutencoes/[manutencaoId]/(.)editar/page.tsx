import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { ManutencaoForm } from "@/components/frota/manutencao-form";
import { createClient } from "@/lib/supabase/server";
import type { ManutencaoFrota } from "@/lib/types";
import { updateManutencao } from "@/app/(dashboard)/frota/[id]/manutencoes/actions";

export default async function EditarManutencaoModal({
  params,
}: {
  params: Promise<{ id: string; manutencaoId: string }>;
}) {
  const { id, manutencaoId } = await params;
  const supabase = await createClient();

  const { data: manutencao } = await supabase
    .from("manutencoes_frota")
    .select("id, veiculo_id, tipo, data_realizada, data_proxima, custo, observacoes, created_at")
    .eq("id", manutencaoId)
    .maybeSingle<ManutencaoFrota>();

  if (!manutencao) notFound();

  return (
    <Modal title="Editar manutenção" className="sm:max-w-2xl">
      <ManutencaoForm
        action={updateManutencao.bind(null, manutencaoId, id)}
        manutencao={manutencao}
        redirectTo={`/frota/${id}`}
      />
    </Modal>
  );
}
