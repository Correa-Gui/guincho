import { Modal } from "@/components/shared/modal";
import { VeiculoForm } from "@/components/frota/veiculo-form";
import { createVeiculo } from "@/app/(dashboard)/frota/actions";

export default function NovoVeiculoModal() {
  return (
    <Modal title="Novo veículo" description="Cadastre um veículo da frota.">
      <VeiculoForm action={createVeiculo} />
    </Modal>
  );
}
