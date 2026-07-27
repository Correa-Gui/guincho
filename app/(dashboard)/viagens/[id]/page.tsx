import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteViagemButton } from "@/components/viagens/delete-viagem-button";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/format";
import { VIAGEM_STATUS_BADGE_CLASS, VIAGEM_STATUS_LABEL, type Viagem } from "@/lib/types";
import { deleteViagem, updateViagemStatus } from "../actions";

export default async function ViagemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: viagem } = await supabase
    .from("viagens")
    .select(
      "id, origem, destino, origem_cidade, origem_uf, destino_cidade, destino_uf, distancia_km, pedagio_estimado, valor, status, data, observacoes, segurado, placa_cliente, clientes(nome), motoristas(nome), veiculos_frota(placa, modelo)",
    )
    .eq("id", id)
    .maybeSingle<Viagem>();

  if (!viagem) notFound();

  const campos: { label: string; value: string }[] = [
    { label: "Cliente", value: viagem.clientes?.nome ?? "—" },
    { label: "Motorista", value: viagem.motoristas?.nome ?? "—" },
    {
      label: "Veículo",
      value: viagem.veiculos_frota
        ? `${viagem.veiculos_frota.placa}${viagem.veiculos_frota.modelo ? ` — ${viagem.veiculos_frota.modelo}` : ""}`
        : "—",
    },
    { label: "Segurado", value: viagem.segurado ?? "—" },
    { label: "Placa do cliente", value: viagem.placa_cliente ?? "—" },
    {
      label: "Origem",
      value: viagem.origem_cidade
        ? `${viagem.origem_cidade} - ${viagem.origem_uf}${viagem.origem ? ` (${viagem.origem})` : ""}`
        : viagem.origem ?? "—",
    },
    {
      label: "Destino",
      value: viagem.destino_cidade
        ? `${viagem.destino_cidade} - ${viagem.destino_uf}${viagem.destino ? ` (${viagem.destino})` : ""}`
        : viagem.destino ?? "—",
    },
    { label: "Data", value: formatDate(viagem.data) },
  ];

  if (viagem.distancia_km !== null) {
    campos.push({ label: "Distância", value: `${viagem.distancia_km} km` });
  }
  if (viagem.pedagio_estimado !== null) {
    campos.push({ label: "Pedágio estimado", value: formatCurrency(viagem.pedagio_estimado) });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ordem de Serviço
            </h1>
            <Badge className={VIAGEM_STATUS_BADGE_CLASS[viagem.status]}>
              {VIAGEM_STATUS_LABEL[viagem.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Viagem de {formatDate(viagem.data)}
          </p>
        </div>
        <Button variant="outline" render={<Link href={`/viagens/${viagem.id}/editar`} />} nativeButton={false}>
          <Pencil />
          Editar
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {campos.map((campo) => (
              <div key={campo.label}>
                <div className="text-xs text-muted-foreground">{campo.label}</div>
                <div className="text-sm font-medium text-foreground">{campo.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Valor</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {formatCurrency(viagem.valor)}
            </div>
          </div>

          {viagem.observacoes ? (
            <div>
              <div className="text-xs text-muted-foreground">Observações</div>
              <div className="text-sm text-foreground">{viagem.observacoes}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateViagemStatus.bind(null, viagem.id)} className="flex flex-wrap items-end gap-3">
            <Select name="status" defaultValue={viagem.status} items={VIAGEM_STATUS_LABEL}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VIAGEM_STATUS_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              Atualizar status
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <DeleteViagemButton action={deleteViagem.bind(null, viagem.id)} />
      </div>
    </div>
  );
}
