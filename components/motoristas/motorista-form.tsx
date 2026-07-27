"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import type { MotoristaCompleto } from "@/lib/types";
import type { MotoristaFormState } from "@/app/(dashboard)/motoristas/actions";

type Action = (prev: MotoristaFormState, formData: FormData) => Promise<MotoristaFormState>;

export function MotoristaForm({
  action,
  motorista,
}: {
  action: Action;
  motorista?: MotoristaCompleto;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  useFormFeedback(state, {
    successMessage: "Motorista salvo com sucesso.",
    redirectTo: "/motoristas",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          name="nome"
          placeholder="Nome completo do motorista"
          defaultValue={motorista?.nome ?? ""}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
        <Input
          id="telefone"
          name="telefone"
          placeholder="Ex: (16) 99999-8888"
          defaultValue={motorista?.telefone ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Usado para identificar automaticamente quem enviou lançamentos pelo grupo do WhatsApp.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={motorista?.ativo ?? true}
          className="size-4 accent-brand"
        />
        Motorista ativo
      </label>

      <Button type="submit" variant="brand" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar motorista"}
      </Button>
    </form>
  );
}
