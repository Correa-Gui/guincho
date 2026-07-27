import { Modal } from "@/components/shared/modal";
import { LancamentoForm } from "@/components/financeiro/lancamento-form";
import { createClient } from "@/lib/supabase/server";
import { createLancamento } from "@/app/(dashboard)/financeiro/actions";

export default async function NovoLancamentoModal() {
  const supabase = await createClient();

  const [{ data: viagens }, { data: motoristas }] = await Promise.all([
    supabase.from("viagens").select("id, origem, destino").order("data", { ascending: false }),
    supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  return (
    <Modal title="Novo lançamento" description="Registre uma receita ou despesa.">
      <LancamentoForm action={createLancamento} viagens={viagens ?? []} motoristas={motoristas ?? []} />
    </Modal>
  );
}
