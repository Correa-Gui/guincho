import { Modal } from "@/components/shared/modal";
import { MotoristaForm } from "@/components/motoristas/motorista-form";
import { createMotorista } from "@/app/(dashboard)/motoristas/actions";

export default function NovoMotoristaModal() {
  return (
    <Modal title="Novo motorista" description="Cadastre um motorista da frota.">
      <MotoristaForm action={createMotorista} />
    </Modal>
  );
}
