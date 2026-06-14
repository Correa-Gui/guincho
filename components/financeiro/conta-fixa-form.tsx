"use client";

import { useActionState, useState } from "react";
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
import {
  LANCAMENTO_CATEGORIAS,
  LANCAMENTO_TIPO_LABEL,
  type ContaFixa,
  type LancamentoTipo,
} from "@/lib/types";
import type { FinanceiroFormState } from "@/app/(dashboard)/financeiro/actions";

type Action = (prev: FinanceiroFormState, formData: FormData) => Promise<FinanceiroFormState>;

export function ContaFixaForm({
  action,
  contaFixa,
}: {
  action: Action;
  contaFixa?: ContaFixa;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [tipo, setTipo] = useState<LancamentoTipo>(contaFixa?.tipo ?? "despesa");

  useFormFeedback(state, {
    successMessage: "Conta fixa salva com sucesso.",
    redirectTo: "/financeiro",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Input
          id="descricao"
          name="descricao"
          placeholder="Ex: Aluguel, Internet, Contrato mensal..."
          defaultValue={contaFixa?.descricao ?? ""}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            name="tipo"
            value={tipo}
            onValueChange={(value) => setTipo(value as LancamentoTipo)}
            items={LANCAMENTO_TIPO_LABEL}
          >
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LANCAMENTO_TIPO_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Select
            name="categoria"
            defaultValue={contaFixa?.categoria ?? LANCAMENTO_CATEGORIAS[tipo][0]}
            items={LANCAMENTO_CATEGORIAS[tipo].map((categoria) => ({ value: categoria, label: categoria }))}
          >
            <SelectTrigger id="categoria" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANCAMENTO_CATEGORIAS[tipo].map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoria}
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
            defaultValue={contaFixa ? contaFixa.valor.toFixed(2).replace(".", ",") : ""}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dia_vencimento">Dia do vencimento</Label>
          <Input
            id="dia_vencimento"
            name="dia_vencimento"
            type="number"
            min={1}
            max={28}
            defaultValue={contaFixa?.dia_vencimento ?? 1}
            required
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={contaFixa?.ativo ?? true}
          className="size-4 accent-brand"
        />
        Conta ativa (gera lançamento todo mês)
      </label>

      <Button type="submit" variant="brand" disabled={pending} className="self-start">
        {pending ? "Salvando..." : "Salvar conta fixa"}
      </Button>
    </form>
  );
}
