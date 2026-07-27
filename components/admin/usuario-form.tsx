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
import type { PerfilAcesso } from "@/lib/types";
import { criarUsuario } from "@/app/(dashboard)/admin/perfil-acesso/actions";

export function UsuarioForm({ perfis }: { perfis: PerfilAcesso[] }) {
  const [state, formAction, pending] = useActionState(criarUsuario, {});
  const [role, setRole] = useState<"admin" | "operador">("operador");

  useFormFeedback(state, { successMessage: "Usuário criado com sucesso." });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" placeholder="Nome completo" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" placeholder="email@empresa.com" required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" name="senha" type="password" placeholder="Mínimo 6 caracteres" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Função</Label>
          <Select
            name="role"
            value={role}
            onValueChange={(value) => setRole(value as "admin" | "operador")}
            items={{ operador: "Operador", admin: "Admin" }}
          >
            <SelectTrigger id="role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operador">Operador</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {role === "operador" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="perfil_id">Perfil de acesso (opcional)</Label>
          <Select
            name="perfil_id"
            defaultValue="none"
            items={{ none: "Sem perfil (sem restrição)", ...Object.fromEntries(perfis.map((p) => [p.id, p.nome])) }}
          >
            <SelectTrigger id="perfil_id" className="w-full">
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
        </div>
      )}

      <Button type="submit" variant="brand" disabled={pending} className="self-start">
        {pending ? "Criando..." : "Criar usuário"}
      </Button>
    </form>
  );
}
