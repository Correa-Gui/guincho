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
import { createMotorista } from "@/app/(dashboard)/motoristas/actions";
import { MotoristaForm } from "@/components/motoristas/motorista-form";

export function NovoMotoristaButton({ label = "Novo motorista" }: { label?: string }) {
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
            <DialogTitle>Novo motorista</DialogTitle>
            <DialogDescription>Cadastre um motorista da frota.</DialogDescription>
          </DialogHeader>
          <ModalCloseContext.Provider value={close}>
            <MotoristaForm action={createMotorista} />
          </ModalCloseContext.Provider>
        </DialogContent>
      </Dialog>
    </>
  );
}
