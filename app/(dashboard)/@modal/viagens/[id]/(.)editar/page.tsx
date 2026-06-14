import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { ViagemForm } from "@/components/viagens/viagem-form";
import { createClient } from "@/lib/supabase/server";
import type { Viagem } from "@/lib/types";
import { updateViagem } from "@/app/(dashboard)/viagens/actions";

export default async function EditarViagemModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: viagem }, { data: clientes }, { data: motoristas }, { data: veiculos }] =
    await Promise.all([
      supabase
        .from("viagens")
        .select(
          "id, cliente_id, motorista_id, veiculo_id, origem, destino, valor, status, data, observacoes, clientes(nome), motoristas(nome), veiculos_frota(placa, modelo)",
        )
        .eq("id", id)
        .maybeSingle<Viagem>(),
      supabase.from("clientes").select("id, nome").order("nome"),
      supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("veiculos_frota").select("id, placa, modelo").order("placa"),
    ]);

  if (!viagem) notFound();

  return (
    <Modal title="Editar viagem">
      <ViagemForm
        action={updateViagem.bind(null, id)}
        viagem={viagem}
        clientes={clientes ?? []}
        motoristas={motoristas ?? []}
        veiculos={veiculos ?? []}
      />
    </Modal>
  );
}
