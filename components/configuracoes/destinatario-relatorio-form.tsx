"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import { createDestinatarioRelatorio } from "@/app/(dashboard)/admin/configuracoes/actions";

export function DestinatarioRelatorioForm() {
  const [state, formAction, pending] = useActionState(createDestinatarioRelatorio, {});

  useFormFeedback(state, { successMessage: "Número adicionado com sucesso." });

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="numero">Número (com DDI e DDD)</Label>
        <Input
          id="numero"
          name="numero"
          placeholder="5516999999999"
          inputMode="numeric"
          className="font-mono"
          required
        />
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="nome">Nome (opcional)</Label>
        <Input id="nome" name="nome" placeholder="Ex: Gerente" />
      </div>

      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar número"}
      </Button>
    </form>
  );
}
