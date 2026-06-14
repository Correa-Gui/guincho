import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { VeiculoForm } from "@/components/frota/veiculo-form";
import { createClient } from "@/lib/supabase/server";
import type { VeiculoFrotaCompleto } from "@/lib/types";
import { updateVeiculo } from "@/app/(dashboard)/frota/actions";

export default async function EditarVeiculoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: veiculo } = await supabase
    .from("veiculos_frota")
    .select("id, placa, modelo, ano, status, created_at")
    .eq("id", id)
    .maybeSingle<VeiculoFrotaCompleto>();

  if (!veiculo) notFound();

  return (
    <Modal title="Editar veículo">
      <VeiculoForm action={updateVeiculo.bind(null, id)} veiculo={veiculo} />
    </Modal>
  );
}
