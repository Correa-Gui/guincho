import Link from "next/link";
import { Plus, LogOut as ExitIcon, Warehouse, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
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
import { formatDateTime } from "@/lib/format";
import { PATIO_STATUS_BADGE_CLASS, PATIO_STATUS_LABEL, type Patio } from "@/lib/types";
import { deletePatio, registrarSaida } from "./actions";

export default async function PatioPage() {
  const supabase = await createClient();
  const { data: registros } = await supabase
    .from("patio")
    .select("id, veiculo_placa, motivo, entrada, saida, status, created_at")
    .order("entrada", { ascending: false })
    .returns<Patio[]>();

  const lista = registros ?? [];
  const noPatio = lista.filter((registro) => registro.status === "no_patio");
  const historico = lista.filter((registro) => registro.status === "liberado");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Pátio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle de entrada e saída de veículos.
          </p>
        </div>
        <Button
          variant="brand"
          render={<Link href="/patio/novo" />}
          nativeButton={false}
        >
          <Plus />
          Nova entrada
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No pátio</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {noPatio.length === 0 ? (
            <EmptyState
              bare
              icon={Warehouse}
              title="Nenhum veículo no pátio"
              description="Registre uma entrada para começar o controle."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noPatio.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="font-mono font-medium">{registro.veiculo_placa}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {registro.motivo ?? "—"}
                    </TableCell>
                    <TableCell>{formatDateTime(registro.entrada)}</TableCell>
                    <TableCell>
                      <Badge className={PATIO_STATUS_BADGE_CLASS[registro.status]}>
                        {PATIO_STATUS_LABEL[registro.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={registrarSaida.bind(null, registro.id)}>
                          <Button type="submit" variant="secondary" size="sm">
                            <ExitIcon />
                            Registrar saída
                          </Button>
                        </form>
                        <DeleteButton
                          action={deletePatio.bind(null, registro.id)}
                          confirmMessage="Excluir este registro de pátio? Essa ação não pode ser desfeita."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {historico.length === 0 ? (
            <EmptyState
              bare
              icon={History}
              title="Nenhum registro no histórico"
              description="Veículos liberados aparecerão aqui."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell className="font-mono font-medium">{registro.veiculo_placa}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {registro.motivo ?? "—"}
                    </TableCell>
                    <TableCell>{formatDateTime(registro.entrada)}</TableCell>
                    <TableCell>{registro.saida ? formatDateTime(registro.saida) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        action={deletePatio.bind(null, registro.id)}
                        confirmMessage="Excluir este registro de pátio? Essa ação não pode ser desfeita."
                      />
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
