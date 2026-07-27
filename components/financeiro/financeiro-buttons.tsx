"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalCloseContext } from "@/lib/modal-context";
import { createLancamento, createConta, createContaFixa } from "@/app/(dashboard)/financeiro/actions";
import { LancamentoForm } from "@/components/financeiro/lancamento-form";
import { ContaForm } from "@/components/financeiro/conta-form";
import { ContaFixaForm } from "@/components/financeiro/conta-fixa-form";
import type { Cliente } from "@/lib/types";

type ViagemRef = { id: string; origem: string | null; destino: string | null };
type MotoristaRef = { id: string; nome: string };

export function NovoLancamentoButton({
  viagens,
  motoristas,
}: {
  viagens: ViagemRef[];
  motoristas: MotoristaRef[];
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button size="sm" variant="brand" onClick={() => setOpen(true)}>
        <Plus />
        Novo lançamento
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
            <DialogDescription>Registre uma receita ou despesa.</DialogDescription>
          </DialogHeader>
          <ModalCloseContext.Provider value={close}>
            <LancamentoForm action={createLancamento} viagens={viagens} motoristas={motoristas} />
          </ModalCloseContext.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NovaContaButton({
  clientes,
  viagens,
}: {
  clientes: Cliente[];
  viagens: ViagemRef[];
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button size="sm" variant="brand" onClick={() => setOpen(true)}>
        <Plus />
        Nova conta
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova conta a receber</DialogTitle>
            <DialogDescription>Registre um valor a receber de um cliente.</DialogDescription>
          </DialogHeader>
          <ModalCloseContext.Provider value={close}>
            <ContaForm action={createConta} clientes={clientes} viagens={viagens} />
          </ModalCloseContext.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NovaContaFixaButton() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button size="sm" variant="brand" onClick={() => setOpen(true)}>
        <Plus />
        Nova conta fixa
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova conta fixa</DialogTitle>
            <DialogDescription>Despesas e receitas recorrentes que se repetem todo mês.</DialogDescription>
          </DialogHeader>
          <ModalCloseContext.Provider value={close}>
            <ContaFixaForm action={createContaFixa} />
          </ModalCloseContext.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
