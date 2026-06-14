"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteViagemButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Excluir esta viagem? Essa ação não pode ser desfeita.")) {
          event.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive">
        <Trash2 />
        Excluir
      </Button>
    </form>
  );
}
