import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { ContaForm } from "@/components/financeiro/conta-form";
import { createClient } from "@/lib/supabase/server";
import type { ContaAReceber } from "@/lib/types";
import { updateConta } from "@/app/(dashboard)/financeiro/actions";

export default async function EditarContaModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: conta }, { data: clientes }, { data: viagens }] = await Promise.all([
    supabase
      .from("contas_a_receber")
      .select("id, viagem_id, cliente_id, valor, vencimento, status, created_at, clientes(nome), viagens(id, origem, destino)")
      .eq("id", id)
      .maybeSingle<ContaAReceber>(),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("viagens").select("id, origem, destino").order("data", { ascending: false }),
  ]);

  if (!conta) notFound();

  return (
    <Modal title="Editar conta a receber">
      <ContaForm
        action={updateConta.bind(null, id)}
        conta={conta}
        clientes={clientes ?? []}
        viagens={viagens ?? []}
      />
    </Modal>
  );
}
