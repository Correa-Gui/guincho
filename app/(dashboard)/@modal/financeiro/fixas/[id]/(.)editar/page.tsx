import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { ContaFixaForm } from "@/components/financeiro/conta-fixa-form";
import { createClient } from "@/lib/supabase/server";
import type { ContaFixa } from "@/lib/types";
import { updateContaFixa } from "@/app/(dashboard)/financeiro/actions";

export default async function EditarContaFixaModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contaFixa } = await supabase
    .from("contas_fixas")
    .select("id, descricao, tipo, categoria, valor, dia_vencimento, ativo, created_at")
    .eq("id", id)
    .maybeSingle<ContaFixa>();

  if (!contaFixa) notFound();

  return (
    <Modal title="Editar conta fixa">
      <ContaFixaForm action={updateContaFixa.bind(null, id)} contaFixa={contaFixa} />
    </Modal>
  );
}
