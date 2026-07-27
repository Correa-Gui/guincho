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
import { createVeiculo } from "@/app/(dashboard)/frota/actions";
import { VeiculoForm } from "@/components/frota/veiculo-form";

export function NovoVeiculoButton({ label = "Novo veículo" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Plus />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo veículo</DialogTitle>
            <DialogDescription>Cadastre um veículo na frota.</DialogDescription>
          </DialogHeader>
          <ModalCloseContext.Provider value={close}>
            <VeiculoForm action={createVeiculo} />
          </ModalCloseContext.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
