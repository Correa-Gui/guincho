import { Modal } from "@/components/shared/modal";
import { AbastecimentoForm } from "@/components/abastecimentos/abastecimento-form";
import { createClient } from "@/lib/supabase/server";
import { createAbastecimento } from "@/app/(dashboard)/abastecimentos/actions";

export default async function NovoAbastecimentoModal() {
  const supabase = await createClient();

  const [{ data: veiculos }, { data: motoristas }] = await Promise.all([
    supabase.from("veiculos_frota").select("id, placa, modelo").order("placa"),
    supabase.from("motoristas").select("id, nome").order("nome"),
  ]);

  return (
    <Modal
      title="Novo abastecimento"
      description="Registre um abastecimento da frota."
      className="sm:max-w-2xl"
    >
      <AbastecimentoForm
        action={createAbastecimento}
        veiculos={veiculos ?? []}
        motoristas={motoristas ?? []}
      />
    </Modal>
  );
}
