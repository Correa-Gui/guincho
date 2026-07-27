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
import { todayInputValue } from "@/lib/format";
import { MANUTENCAO_TIPO_LABEL, type ManutencaoFrota } from "@/lib/types";
import type { ManutencaoFormState } from "@/app/(dashboard)/frota/[id]/manutencoes/actions";

type Action = (
  prev: ManutencaoFormState,
  formData: FormData,
) => Promise<ManutencaoFormState>;

export function ManutencaoForm({
  action,
  manutencao,
  redirectTo,
}: {
  action: Action;
  manutencao?: ManutencaoFrota;
  redirectTo: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  useFormFeedback(state, {
    successMessage: "Manutenção salva com sucesso.",
    redirectTo,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            name="tipo"
            defaultValue={manutencao?.tipo ?? "troca_oleo"}
            items={MANUTENCAO_TIPO_LABEL}
          >
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MANUTENCAO_TIPO_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="custo">Custo (opcional)</Label>
          <Input
            id="custo"
            name="custo"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={manutencao?.custo != null ? String(manutencao.custo).replace(".", ",") : ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data_realizada">Data realizada</Label>
          <Input
            id="data_realizada"
            name="data_realizada"
            type="date"
            defaultValue={manutencao?.data_realizada ?? todayInputValue()}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="data_proxima">Próxima (opcional)</Label>
          <Input
            id="data_proxima"
            name="data_proxima"
            type="date"
            defaultValue={manutencao?.data_proxima ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          placeholder="Detalhes da manutenção"
          defaultValue={manutencao?.observacoes ?? ""}
        />
      </div>

      <Button type="submit" variant="brand" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar manutenção"}
      </Button>
    </form>
  );
}
