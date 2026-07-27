import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { AbastecimentoForm } from "@/components/abastecimentos/abastecimento-form";
import { createClient } from "@/lib/supabase/server";
import type { Abastecimento } from "@/lib/types";
import { updateAbastecimento } from "@/app/(dashboard)/abastecimentos/actions";

export default async function EditarAbastecimentoModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: abastecimento }, { data: veiculos }, { data: motoristas }] = await Promise.all([
    supabase
      .from("abastecimentos")
      .select(
        "id, veiculo_id, motorista_id, data, litros, valor_litro, valor_total, km_atual, posto, observacoes, lancamento_id, created_at, veiculos_frota(placa, modelo), motoristas(nome)",
      )
      .eq("id", id)
      .maybeSingle<Abastecimento>(),
    supabase.from("veiculos_frota").select("id, placa, modelo").order("placa"),
    supabase.from("motoristas").select("id, nome").order("nome"),
  ]);

  if (!abastecimento) notFound();

  return (
    <Modal title="Editar abastecimento" className="sm:max-w-2xl">
      <AbastecimentoForm
        action={updateAbastecimento.bind(null, id)}
        abastecimento={abastecimento}
        veiculos={veiculos ?? []}
        motoristas={motoristas ?? []}
      />
    </Modal>
  );
}
