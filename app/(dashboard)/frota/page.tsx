import Link from "next/link";
import { Car, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { NovoVeiculoButton } from "@/components/frota/novo-veiculo-button";
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
import {
  VEICULO_STATUS_BADGE_CLASS,
  VEICULO_STATUS_LABEL,
  type VeiculoFrotaCompleto,
} from "@/lib/types";
import { deleteVeiculo } from "./actions";

export default async function FrotaPage() {
  const supabase = await createClient();
  const { data: veiculos } = await supabase
    .from("veiculos_frota")
    .select("id, placa, modelo, ano, status, consumo_kml, tarifa_km, created_at")
    .order("placa")
    .returns<VeiculoFrotaCompleto[]>();

  const lista = veiculos ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Frota
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Veículos cadastrados e seus status.
          </p>
        </div>
        <NovoVeiculoButton />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Nenhum veículo cadastrado ainda"
          description="Cadastre o primeiro veículo da frota."
          actionNode={<NovoVeiculoButton label="Cadastrar veículo" />}
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((veiculo) => (
                  <TableRow key={veiculo.id}>
                    <TableCell className="font-mono font-medium">{veiculo.placa}</TableCell>
                    <TableCell>{veiculo.modelo ?? "—"}</TableCell>
                    <TableCell>{veiculo.ano ?? "—"}</TableCell>
                    <TableCell>
                      {veiculo.consumo_kml ? `${veiculo.consumo_kml} km/l` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={VEICULO_STATUS_BADGE_CLASS[veiculo.status]}>
                        {VEICULO_STATUS_LABEL[veiculo.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={`/frota/${veiculo.id}`} />}
                          nativeButton={false}
                        >
                          <Eye />
                          Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={`/frota/${veiculo.id}/editar`} />}
                          nativeButton={false}
                        >
                          Editar
                        </Button>
                        <DeleteButton
                          action={deleteVeiculo.bind(null, veiculo.id)}
                          confirmMessage="Excluir este veículo? Essa ação não pode ser desfeita."
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
