"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import { createGrupo } from "@/app/(dashboard)/admin/whatsapp/actions";

export function GrupoForm() {
  const [state, formAction, pending] = useActionState(createGrupo, {});

  useFormFeedback(state, { successMessage: "Grupo vinculado com sucesso." });

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="grupo_jid">JID do grupo</Label>
        <Input
          id="grupo_jid"
          name="grupo_jid"
          placeholder="120363012345678901@g.us"
          className="font-mono"
          required
        />
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="nome">Nome (opcional)</Label>
        <Input id="nome" name="nome" placeholder="Ex: Equipe Guincho" />
      </div>

      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Salvando..." : "Vincular grupo"}
      </Button>
    </form>
  );
}
