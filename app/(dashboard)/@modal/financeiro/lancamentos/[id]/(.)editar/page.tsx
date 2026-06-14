import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { LancamentoForm } from "@/components/financeiro/lancamento-form";
import { createClient } from "@/lib/supabase/server";
import type { LancamentoFinanceiro } from "@/lib/types";
import { updateLancamento } from "@/app/(dashboard)/financeiro/actions";

export default async function EditarLancamentoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lancamento }, { data: viagens }] = await Promise.all([
    supabase
      .from("lancamentos_financeiros")
      .select("id, viagem_id, tipo, categoria, valor, descricao, data, created_at, viagens(id, origem, destino)")
      .eq("id", id)
      .maybeSingle<LancamentoFinanceiro>(),
    supabase.from("viagens").select("id, origem, destino").order("data", { ascending: false }),
  ]);

  if (!lancamento) notFound();

  return (
    <Modal title="Editar lançamento">
      <LancamentoForm
        action={updateLancamento.bind(null, id)}
        lancamento={lancamento}
        viagens={viagens ?? []}
      />
    </Modal>
  );
}
