import { Modal } from "@/components/shared/modal";
import { ViagemForm } from "@/components/viagens/viagem-form";
import { createClient } from "@/lib/supabase/server";
import { createViagem } from "@/app/(dashboard)/viagens/actions";

export default async function NovaViagemModal() {
  const supabase = await createClient();

  const [{ data: clientes }, { data: motoristas }, { data: veiculos }] = await Promise.all([
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("veiculos_frota").select("id, placa, modelo").order("placa"),
  ]);

  return (
    <Modal title="Nova viagem" description="Registre um novo serviço de guincho.">
      <ViagemForm
        action={createViagem}
        clientes={clientes ?? []}
        motoristas={motoristas ?? []}
        veiculos={veiculos ?? []}
      />
    </Modal>
  );
}
