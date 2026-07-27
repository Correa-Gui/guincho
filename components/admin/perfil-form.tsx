"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import { PAGINAS_MENU, type PerfilAcesso } from "@/lib/types";
import { salvarPerfil } from "@/app/(dashboard)/admin/perfil-acesso/actions";

export function PerfilForm({ perfil }: { perfil?: PerfilAcesso }) {
  const [state, formAction, pending] = useActionState(salvarPerfil, {});

  useFormFeedback(state, {
    successMessage: perfil ? "Perfil atualizado com sucesso." : "Perfil criado com sucesso.",
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {perfil ? <input type="hidden" name="id" value={perfil.id} /> : null}

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor={`nome-${perfil?.id ?? "novo"}`}>Nome do perfil</Label>
        <Input
          id={`nome-${perfil?.id ?? "novo"}`}
          name="nome"
          placeholder="Ex: Motorista, Financeiro, Gerente..."
          defaultValue={perfil?.nome ?? ""}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PAGINAS_MENU.map((grupo) => (
          <div key={grupo.grupo} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {grupo.grupo}
            </p>
            {grupo.itens.map((item) => (
              <label key={item.value} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="paginas"
                  value={item.value}
                  defaultChecked={perfil?.paginas?.includes(item.value) ?? false}
                  className="size-4 accent-brand"
                />
                {item.label}
              </label>
            ))}
          </div>
        ))}
      </div>

      <Button type="submit" variant="brand" disabled={pending} className="self-start">
        {pending ? "Salvando..." : perfil ? "Salvar alterações" : "Criar perfil"}
      </Button>
    </form>
  );
}
