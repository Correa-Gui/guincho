import { Modal } from "@/components/shared/modal";
import { ContaForm } from "@/components/financeiro/conta-form";
import { createClient } from "@/lib/supabase/server";
import { createConta } from "@/app/(dashboard)/financeiro/actions";

export default async function NovaContaModal() {
  const supabase = await createClient();

  const [{ data: clientes }, { data: viagens }] = await Promise.all([
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("viagens").select("id, origem, destino").order("data", { ascending: false }),
  ]);

  return (
    <Modal title="Nova conta a receber" description="Registre um valor a receber de um cliente.">
      <ContaForm action={createConta} clientes={clientes ?? []} viagens={viagens ?? []} />
    </Modal>
  );
}
