import { Modal } from "@/components/shared/modal";
import { EntradaForm } from "@/components/patio/entrada-form";
import { createEntrada } from "@/app/(dashboard)/patio/actions";

export default function NovaEntradaModal() {
  return (
    <Modal title="Nova entrada" description="Registre a entrada de um veículo no pátio.">
      <EntradaForm action={createEntrada} />
    </Modal>
  );
}
