"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import { DOCUMENTO_TIPO_LABEL, type DocumentoFrota } from "@/lib/types";
import type { DocumentoFormState } from "@/app/(dashboard)/frota/[id]/documentos/actions";

type Action = (
  prev: DocumentoFormState,
  formData: FormData,
) => Promise<DocumentoFormState>;

export function DocumentoForm({
  action,
  documento,
  redirectTo,
}: {
  action: Action;
  documento?: DocumentoFrota;
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  useFormFeedback(state, {
    successMessage: "Documento salvo com sucesso.",
    redirectTo,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            name="tipo"
            defaultValue={documento?.tipo ?? "crlv"}
            items={DOCUMENTO_TIPO_LABEL}
          >
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENTO_TIPO_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="numero">Número (opcional)</Label>
          <Input
            id="numero"
            name="numero"
            type="text"
            placeholder="Número/identificação do documento"
            defaultValue={documento?.numero ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-[50%]">
        <Label htmlFor="vencimento">Vencimento</Label>
        <Input
          id="vencimento"
          name="vencimento"
          type="date"
          defaultValue={documento?.vencimento ?? ""}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          placeholder="Detalhes do documento"
          defaultValue={documento?.observacoes ?? ""}
        />
      </div>

      <Button type="submit" variant="brand" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar documento"}
      </Button>
    </form>
  );
}
