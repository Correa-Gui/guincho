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
import type { Abastecimento } from "@/lib/types";
import type { AbastecimentoFormState } from "@/app/(dashboard)/abastecimentos/actions";

type Action = (
  prev: AbastecimentoFormState,
  formData: FormData,
) => Promise<AbastecimentoFormState>;

export function AbastecimentoForm({
  action,
  abastecimento,
  veiculos,
  motoristas,
}: {
  action: Action;
  abastecimento?: Abastecimento;
  veiculos: { id: string; placa: string; modelo: string | null }[];
  motoristas: { id: string; nome: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  useFormFeedback(state, {
    successMessage: "Abastecimento salvo com sucesso.",
    redirectTo: "/abastecimentos",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="veiculo_id">Veículo</Label>
          <Select
            name="veiculo_id"
            defaultValue={abastecimento?.veiculo_id ?? ""}
            items={Object.fromEntries(
              veiculos.map((v) => [v.id, `${v.placa}${v.modelo ? ` - ${v.modelo}` : ""}`]),
            )}
          >
            <SelectTrigger id="veiculo_id" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {veiculos.map((veiculo) => (
                <SelectItem key={veiculo.id} value={veiculo.id}>
                  {veiculo.placa}
                  {veiculo.modelo ? ` - ${veiculo.modelo}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="motorista_id">Motorista (opcional)</Label>
          <Select
            name="motorista_id"
            defaultValue={abastecimento?.motorista_id ?? ""}
            items={{
              "": "Nenhum",
              ...Object.fromEntries(motoristas.map((m) => [m.id, m.nome])),
            }}
          >
            <SelectTrigger id="motorista_id" className="w-full">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {motoristas.map((motorista) => (
                <SelectItem key={motorista.id} value={motorista.id}>
                  {motorista.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input
            id="data"
            name="data"
            type="date"
            defaultValue={abastecimento?.data ?? todayInputValue()}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="litros">Litros</Label>
          <Input
            id="litros"
            name="litros"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={abastecimento ? String(abastecimento.litros).replace(".", ",") : ""}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="valor_total">Valor total (R$)</Label>
          <Input
            id="valor_total"
            name="valor_total"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={abastecimento ? abastecimento.valor_total.toFixed(2).replace(".", ",") : ""}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="km_atual">Km atual (opcional)</Label>
          <Input
            id="km_atual"
            name="km_atual"
            type="number"
            inputMode="numeric"
            placeholder="0"
            defaultValue={abastecimento?.km_atual ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="posto">Posto (opcional)</Label>
          <Input
            id="posto"
            name="posto"
            type="text"
            placeholder="Nome do posto"
            defaultValue={abastecimento?.posto ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          name="observacoes"
          placeholder="Detalhes do abastecimento"
          defaultValue={abastecimento?.observacoes ?? ""}
        />
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Salvando..." : "Salvar abastecimento"}
      </Button>
    </form>
  );
}
