import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { BrasilMapaViagens } from "@/components/viagens/brasil-mapa";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";
import { VIAGEM_STATUS_BADGE_CLASS, VIAGEM_STATUS_LABEL, type Viagem } from "@/lib/types";

export default async function ViagensPage() {
  const supabase = await createClient();
  const { data: viagens } = await supabase
    .from("viagens")
    .select(
      "id, origem, destino, origem_uf, destino_uf, valor, status, data, segurado, seguradora, placa_cliente, clientes(nome), motoristas(nome), veiculos_frota(placa, modelo)",
    )
    .order("data", { ascending: false })
    .returns<Viagem[]>();

  const lista = viagens ?? [];

  const contagemPorUf: Record<string, number> = {};
  for (const viagem of lista) {
    if (viagem.origem_uf) contagemPorUf[viagem.origem_uf] = (contagemPorUf[viagem.origem_uf] ?? 0) + 1;
    if (viagem.destino_uf) contagemPorUf[viagem.destino_uf] = (contagemPorUf[viagem.destino_uf] ?? 0) + 1;
  }
  const totalEstados = Object.keys(contagemPorUf).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Viagens
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe e registre os serviços de guincho.
          </p>
        </div>
        <Button variant="brand" render={<Link href="/viagens/nova" />} nativeButton={false}>
          <Plus />
          Nova viagem
        </Button>
      </div>

      {totalEstados > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Viagens por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-xl">
              <BrasilMapaViagens contagens={contagemPorUf} />
            </div>
          </CardContent>
        </Card>
      )}

      {lista.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Nenhuma viagem cadastrada ainda"
          description="Cadastre a primeira viagem para começar a acompanhar os serviços."
          actionLabel="Cadastrar viagem"
          actionHref="/viagens/nova"
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {lista.map((viagem) => (
              <Link key={viagem.id} href={`/viagens/${viagem.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatDate(viagem.data)}
                      </span>
                      <Badge className={VIAGEM_STATUS_BADGE_CLASS[viagem.status]}>
                        {VIAGEM_STATUS_LABEL[viagem.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {viagem.clientes?.nome ?? "Sem cliente"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {viagem.origem ?? "—"} → {viagem.destino ?? "—"}
                    </div>
                    {(viagem.seguradora || viagem.segurado || viagem.placa_cliente) && (
                      <div className="truncate text-xs text-muted-foreground">
                        {[viagem.seguradora, viagem.segurado, viagem.placa_cliente].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    <div className="text-right font-mono text-base font-semibold tabular-nums text-foreground">
                      {formatCurrency(viagem.valor)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden sm:block">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Origem → Destino</TableHead>
                    <TableHead>Seguradora / Segurado / Placa</TableHead>
                    <TableHead>Motorista</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((viagem) => (
                    <TableRow key={viagem.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/viagens/${viagem.id}`} className="block">
                          {formatDate(viagem.data)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/viagens/${viagem.id}`} className="block">
                          {viagem.clientes?.nome ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/viagens/${viagem.id}`} className="block max-w-xs truncate">
                          {viagem.origem ?? "—"} → {viagem.destino ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/viagens/${viagem.id}`} className="block max-w-[10rem] truncate">
                          {[viagem.seguradora, viagem.segurado, viagem.placa_cliente].filter(Boolean).join(" · ") || "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/viagens/${viagem.id}`} className="block">
                          {viagem.motoristas?.nome ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/viagens/${viagem.id}`} className="block font-mono tabular-nums">
                          {formatCurrency(viagem.valor)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/viagens/${viagem.id}`} className="block">
                          <Badge className={VIAGEM_STATUS_BADGE_CLASS[viagem.status]}>
                            {VIAGEM_STATUS_LABEL[viagem.status]}
                          </Badge>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
