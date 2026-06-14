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
import { todayInputValue } from "@/lib/format";
import { CONTA_STATUS_LABEL, type Cliente, type ContaAReceber } from "@/lib/types";
import type { FinanceiroFormState } from "@/app/(dashboard)/financeiro/actions";

type Action = (prev: FinanceiroFormState, formData: FormData) => Promise<FinanceiroFormState>;

export function ContaForm({
  action,
  conta,
  clientes,
  viagens,
}: {
  action: Action;
  conta?: ContaAReceber;
  clientes: Cliente[];
  viagens: { id: string; origem: string | null; destino: string | null }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  useFormFeedback(state, {
    successMessage: "Conta salva com sucesso.",
    redirectTo: "/financeiro",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cliente_id">Cliente</Label>
          <Select
            name="cliente_id"
            defaultValue={conta?.cliente_id ?? ""}
            items={{ "": "Nenhum", ...Object.fromEntries(clientes.map((c) => [c.id, c.nome])) }}
          >
            <SelectTrigger id="cliente_id" className="w-full">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="viagem_id">Viagem (opcional)</Label>
          <Select
            name="viagem_id"
            defaultValue={conta?.viagem_id ?? ""}
            items={{
              "": "Nenhuma",
              ...Object.fromEntries(
                viagens.map((v) => [v.id, `${v.origem ?? "—"} → ${v.destino ?? "—"}`]),
              ),
            }}
          >
            <SelectTrigger id="viagem_id" className="w-full">
              <SelectValue placeholder="Nenhuma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhuma</SelectItem>
              {viagens.map((viagem) => (
                <SelectItem key={viagem.id} value={viagem.id}>
                  {viagem.origem ?? "—"} → {viagem.destino ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor">Valor (R$)</Label>
          <Input
            id="valor"
            name="valor"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={conta ? conta.valor.toFixed(2).replace(".", ",") : ""}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="vencimento">Vencimento</Label>
          <Input
            id="vencimento"
            name="vencimento"
            type="date"
            defaultValue={conta?.vencimento ?? todayInputValue()}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={conta?.status ?? "pendente"} items={CONTA_STATUS_LABEL}>
          <SelectTrigger id="status" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONTA_STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Salvando..." : "Salvar conta"}
      </Button>
    </form>
  );
}
