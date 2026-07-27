import { Modal } from "@/components/shared/modal";
import { ContaFixaForm } from "@/components/financeiro/conta-fixa-form";
import { createContaFixa } from "@/app/(dashboard)/financeiro/actions";

export default function NovaContaFixaModal() {
  return (
    <Modal title="Nova conta fixa" description="Despesas e receitas recorrentes que se repetem todo mês.">
      <ContaFixaForm action={createContaFixa} />
    </Modal>
  );
}
