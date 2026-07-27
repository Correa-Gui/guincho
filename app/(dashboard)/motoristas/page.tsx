import Link from "next/link";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { NovoMotoristaButton } from "@/components/motoristas/novo-motorista-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/shared/delete-button";
import { createClient } from "@/lib/supabase/server";
import type { MotoristaCompleto } from "@/lib/types";
import { deleteMotorista } from "./actions";

export default async function MotoristasPage() {
  const supabase = await createClient();
  const { data: motoristas } = await supabase
    .from("motoristas")
    .select("id, nome, telefone, ativo, created_at")
    .order("nome")
    .returns<MotoristaCompleto[]>();

  const lista = motoristas ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Motoristas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Motoristas cadastrados e vínculo com o WhatsApp.
          </p>
        </div>
        <NovoMotoristaButton />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Nenhum motorista cadastrado ainda"
          description="Cadastre o primeiro motorista da frota."
          actionNode={<NovoMotoristaButton label="Cadastrar motorista" />}
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((motorista) => (
                  <TableRow key={motorista.id}>
                    <TableCell className="font-medium">{motorista.nome}</TableCell>
                    <TableCell>{motorista.telefone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={motorista.ativo ? "bg-pos/10 text-pos" : "bg-neg/10 text-neg"}>
                        {motorista.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={`/motoristas/${motorista.id}/editar`} />}
                          nativeButton={false}
                        >
                          Editar
                        </Button>
                        <DeleteButton
                          action={deleteMotorista.bind(null, motorista.id)}
                          confirmMessage="Excluir este motorista? Essa ação não pode ser desfeita."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
