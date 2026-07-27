"use client";

import { Button } from "@/components/ui/button";
import { toggleGrupo } from "@/app/(dashboard)/admin/whatsapp/actions";

export function ToggleGrupoButton({ id, ativo }: { id: string; ativo: boolean }) {
  return (
    <form action={toggleGrupo.bind(null, id, ativo)}>
      <Button type="submit" variant="outline" size="sm">
        {ativo ? "Desativar" : "Ativar"}
      </Button>
    </form>
  );
}
