"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function marcarAlertaLido(id: string, lido: boolean) {
  const supabase = await createClient();
  await supabase.from("alertas").update({ lido }).eq("id", id);

  revalidatePath("/alertas");
  revalidatePath("/", "layout");
}

export async function marcarTodosLidos() {
  const supabase = await createClient();
  await supabase.from("alertas").update({ lido: true }).eq("lido", false);

  revalidatePath("/alertas");
  revalidatePath("/", "layout");
}

export async function deleteAlerta(id: string) {
  const supabase = await createClient();
  await supabase.from("alertas").delete().eq("id", id);

  revalidatePath("/alertas");
  revalidatePath("/", "layout");
}
