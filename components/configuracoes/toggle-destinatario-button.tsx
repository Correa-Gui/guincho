"use client";

import { Button } from "@/components/ui/button";
import { toggleDestinatarioRelatorio } from "@/app/(dashboard)/admin/configuracoes/actions";

export function ToggleDestinatarioButton({ id, ativo }: { id: string; ativo: boolean }) {
  return (
    <form action={toggleDestinatarioRelatorio.bind(null, id, ativo)}>
      <Button type="submit" variant="outline" size="sm">
        {ativo ? "Desativar" : "Ativar"}
      </Button>
    </form>
  );
}
