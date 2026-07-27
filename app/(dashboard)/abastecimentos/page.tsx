import Link from "next/link";
import { Plus, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency, formatDate } from "@/lib/format";
import type { Abastecimento } from "@/lib/types";
import { deleteAbastecimento } from "./actions";

export default async function AbastecimentosPage() {
  const supabase = await createClient();
  const { data: abastecimentos } = await supabase
    .from("abastecimentos")
    .select(
      "id, veiculo_id, motorista_id, data, litros, valor_litro, valor_total, km_atual, posto, observacoes, lancamento_id, created_at, veiculos_frota(placa, modelo), motoristas(nome)",
    )
    .order("data", { ascending: false })
    .returns<Abastecimento[]>();

  const lista = abastecimentos ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Abastecimentos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Histórico de abastecimentos da frota.
          </p>
        </div>
        <Button
          variant="brand"
          render={<Link href="/abastecimentos/novo" />}
          nativeButton={false}
        >
          <Plus />
          Novo abastecimento
        </Button>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Fuel}
          title="Nenhum abastecimento registrado ainda"
          description="Registre o primeiro abastecimento da frota."
          actionLabel="Registrar abastecimento"
          actionHref="/abastecimentos/novo"
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            {/* Mobile: cards */}
            <div className="flex flex-col gap-3 px-4 sm:hidden">
              {lista.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatDate(item.data)}
                      </span>
                      <span className="font-mono text-sm font-medium text-foreground">
                        {item.veiculos_frota?.placa ?? "—"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.litros.toFixed(2).replace(".", ",")} L
                      {item.posto ? ` · ${item.posto}` : ""}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-base font-semibold tabular-nums text-neg">
                        - {formatCurrency(item.valor_total)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={`/abastecimentos/${item.id}/editar`} />}
                          nativeButton={false}
                        >
                          Editar
                        </Button>
                        <DeleteButton
                          action={deleteAbastecimento.bind(null, item.id)}
                          confirmMessage="Excluir este abastecimento? Essa ação não pode ser desfeita."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop: table */}
            <Table className="hidden sm:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-right">Litros</TableHead>
                  <TableHead className="text-right">R$/L</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Km</TableHead>
                  <TableHead>Posto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.data)}</TableCell>
                    <TableCell className="font-mono font-medium">
                      {item.veiculos_frota?.placa ?? "—"}
                    </TableCell>
                    <TableCell>{item.motoristas?.nome ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {item.litros.toFixed(2).replace(".", ",")}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(item.valor_litro)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-neg">
                      {formatCurrency(item.valor_total)}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">{item.km_atual ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {item.posto ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          render={<Link href={`/abastecimentos/${item.id}/editar`} />}
                          nativeButton={false}
                        >
                          Editar
                        </Button>
                        <DeleteButton
                          action={deleteAbastecimento.bind(null, item.id)}
                          confirmMessage="Excluir este abastecimento? Essa ação não pode ser desfeita."
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
