"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import { VEICULO_STATUS_LABEL, type VeiculoFrotaCompleto } from "@/lib/types";
import type { FrotaFormState } from "@/app/(dashboard)/frota/actions";

type Action = (prev: FrotaFormState, formData: FormData) => Promise<FrotaFormState>;

export function VeiculoForm({
  action,
  veiculo,
}: {
  action: Action;
  veiculo?: VeiculoFrotaCompleto;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  useFormFeedback(state, {
    successMessage: "Veículo salvo com sucesso.",
    redirectTo: "/frota",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="placa">Placa</Label>
          <Input
            id="placa"
            name="placa"
            placeholder="ABC1D23"
            defaultValue={veiculo?.placa ?? ""}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input
            id="modelo"
            name="modelo"
            placeholder="Ex: Mercedes-Benz Accelo"
            defaultValue={veiculo?.modelo ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ano">Ano</Label>
          <Input
            id="ano"
            name="ano"
            type="number"
            inputMode="numeric"
            placeholder="2020"
            defaultValue={veiculo?.ano ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={veiculo?.status ?? "ativo"} items={VEICULO_STATUS_LABEL}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VEICULO_STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Salvando..." : "Salvar veículo"}
      </Button>
    </form>
  );
}
