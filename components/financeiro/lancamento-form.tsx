"use client";

import { useActionState, useState } from "react";
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
import {
  LANCAMENTO_CATEGORIAS,
  LANCAMENTO_TIPO_LABEL,
  type LancamentoFinanceiro,
  type LancamentoTipo,
} from "@/lib/types";
import type { FinanceiroFormState } from "@/app/(dashboard)/financeiro/actions";

type Action = (prev: FinanceiroFormState, formData: FormData) => Promise<FinanceiroFormState>;

export function LancamentoForm({
  action,
  lancamento,
  viagens,
  motoristas,
}: {
  action: Action;
  lancamento?: LancamentoFinanceiro;
  viagens: { id: string; origem: string | null; destino: string | null }[];
  motoristas: { id: string; nome: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [tipo, setTipo] = useState<LancamentoTipo>(lancamento?.tipo ?? "receita");

  useFormFeedback(state, {
    successMessage: "Lançamento salvo com sucesso.",
    redirectTo: "/financeiro",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
            defaultValue={lancamento?.categoria ?? LANCAMENTO_CATEGORIAS[tipo][0]}
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
            defaultValue={lancamento ? lancamento.valor.toFixed(2).replace(".", ",") : ""}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="data">Data</Label>
          <Input
            id="data"
            name="data"
            type="date"
            defaultValue={lancamento?.data ?? todayInputValue()}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="viagem_id">Viagem (opcional)</Label>
          <Select
            name="viagem_id"
            defaultValue={lancamento?.viagem_id ?? ""}
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="motorista_id">Motorista (opcional)</Label>
          <Select
            name="motorista_id"
            defaultValue={lancamento?.motorista_id ?? ""}
            items={{ "": "Nenhum", ...Object.fromEntries(motoristas.map((m) => [m.id, m.nome])) }}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          name="descricao"
          placeholder="Detalhes do lançamento"
          defaultValue={lancamento?.descricao ?? ""}
        />
      </div>

      <Button
        type="submit"
        variant="brand"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Salvando..." : "Salvar lançamento"}
      </Button>
    </form>
  );
}
