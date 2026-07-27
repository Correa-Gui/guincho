"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFormFeedback } from "@/components/shared/use-form-feedback";
import type { PerfilAcesso, UsuarioEmpresa } from "@/lib/types";
import { atribuirPerfilUsuario } from "@/app/(dashboard)/admin/perfil-acesso/actions";

export function UsuarioPerfilForm({
  usuario,
  perfis,
}: {
  usuario: UsuarioEmpresa;
  perfis: PerfilAcesso[];
}) {
  const [state, formAction, pending] = useActionState(atribuirPerfilUsuario, {});

  useFormFeedback(state, { successMessage: "Perfil do usuário atualizado." });

  if (usuario.role === "admin") {
    return <span className="text-sm text-muted-foreground">Acesso total (admin)</span>;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="usuario_id" value={usuario.id} />

      <Select name="perfil_id" defaultValue={usuario.perfil_id ?? "none"}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem perfil (sem restrição)</SelectItem>
          {perfis.map((perfil) => (
            <SelectItem key={perfil.id} value={perfil.id}>
              {perfil.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
