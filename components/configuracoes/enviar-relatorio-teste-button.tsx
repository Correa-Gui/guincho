"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import { enviarRelatorioDiarioTeste } from "@/app/(dashboard)/admin/configuracoes/actions";

export function EnviarRelatorioTesteButton() {
  const [state, formAction, pending] = useActionState(enviarRelatorioDiarioTeste, {});

  useFormFeedback(state, { successMessage: "Relatório de teste enviado." });

  return (
    <form action={formAction}>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Enviando..." : "Enviar teste agora"}
      </Button>
    </form>
  );
}
