import { notFound } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { MotoristaForm } from "@/components/motoristas/motorista-form";
import { createClient } from "@/lib/supabase/server";
import type { MotoristaCompleto } from "@/lib/types";
import { updateMotorista } from "@/app/(dashboard)/motoristas/actions";

export default async function EditarMotoristaModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: motorista } = await supabase
    .from("motoristas")
    .select("id, nome, telefone, ativo, created_at")
    .eq("id", id)
    .maybeSingle<MotoristaCompleto>();

  if (!motorista) notFound();

  return (
    <Modal title="Editar motorista">
      <MotoristaForm action={updateMotorista.bind(null, id)} motorista={motorista} />
    </Modal>
  );
}
