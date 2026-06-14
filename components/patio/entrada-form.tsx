"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import type { PatioFormState } from "@/app/(dashboard)/patio/actions";

type Action = (prev: PatioFormState, formData: FormData) => Promise<PatioFormState>;

export function EntradaForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});

  useFormFeedback(state, {
    successMessage: "Entrada registrada com sucesso.",
    redirectTo: "/patio",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="veiculo_placa">Placa do veículo</Label>
        <Input
          id="veiculo_placa"
          name="veiculo_placa"
          placeholder="ABC1D23"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="motivo">Motivo</Label>
        <Textarea id="motivo" name="motivo" placeholder="Motivo da entrada no pátio" />
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Salvando..." : "Registrar entrada"}
      </Button>
    </form>
  );
}
