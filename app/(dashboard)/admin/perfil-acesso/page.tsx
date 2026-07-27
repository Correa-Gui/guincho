import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DeleteButton } from "@/components/shared/delete-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PerfilForm } from "@/components/admin/perfil-form";
import { UsuarioPerfilForm } from "@/components/admin/usuario-perfil-form";
import { createClient } from "@/lib/supabase/server";
import { PAGINAS_MENU, type PerfilAcesso, type UsuarioEmpresa } from "@/lib/types";
import { excluirPerfil } from "./actions";

const LABEL_POR_PAGINA = new Map(
  PAGINAS_MENU.flatMap((grupo) => grupo.itens.map((item) => [item.value, item.label])),
);

export default async function PerfilAcessoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuarioAtual } = user
    ? await supabase.from("usuarios").select("empresa_id, role").eq("id", user.id).single()
    : { data: null };

  if (usuarioAtual?.role !== "admin") {
    redirect("/admin/whatsapp");
  }

  const empresaId = usuarioAtual?.empresa_id ?? null;

  const { data: perfis } = empresaId
    ? await supabase
        .from("perfis_acesso")
        .select("id, nome, paginas, created_at")
        .eq("empresa_id", empresaId)
        .order("created_at")
        .returns<PerfilAcesso[]>()
    : { data: [] };

  const { data: usuarios } = empresaId
    ? await supabase
        .from("usuarios")
        .select("id, nome, role, perfil_id")
        .eq("empresa_id", empresaId)
        .order("nome")
        .returns<UsuarioEmpresa[]>()
    : { data: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Perfil de acesso
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie perfis e defina quais páginas do menu cada tipo de usuário pode acessar. Usuários
          com perfil admin sempre têm acesso total.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <PerfilForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfis cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {(perfis ?? []).length === 0 ? (
            <EmptyState
              bare
              icon={ShieldCheck}
              title="Nenhum perfil cadastrado"
              description="Crie um perfil acima para liberar páginas específicas para um tipo de usuário."
            />
          ) : (
            (perfis ?? []).map((perfil) => (
              <div key={perfil.id} className="flex flex-col gap-4 border-b border-border pb-6 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {perfil.paginas.length === 0
                      ? "Nenhuma página liberada"
                      : perfil.paginas
                          .map((pagina) => LABEL_POR_PAGINA.get(pagina) ?? pagina)
                          .join(", ")}
                  </div>
                  <DeleteButton
                    action={excluirPerfil.bind(null, perfil.id)}
                    confirmMessage={`Excluir o perfil "${perfil.nome}"? Usuários vinculados ficarão sem perfil.`}
                  />
                </div>
                <PerfilForm perfil={perfil} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários da empresa</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {(usuarios ?? []).length === 0 ? (
            <div className="px-6">
              <EmptyState
                bare
                icon={ShieldCheck}
                title="Nenhum usuário encontrado"
                description="Os usuários cadastrados na empresa aparecem aqui."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Perfil de acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usuarios ?? []).map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>{usuario.nome}</TableCell>
                    <TableCell className="capitalize">{usuario.role}</TableCell>
                    <TableCell>
                      <UsuarioPerfilForm usuario={usuario} perfis={perfis ?? []} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
