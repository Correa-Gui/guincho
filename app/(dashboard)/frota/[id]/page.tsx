import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Wrench, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PanelCard } from "@/components/dashboard/panel-card";
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
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, diasEntre } from "@/lib/format";
import {
  VEICULO_STATUS_BADGE_CLASS,
  VEICULO_STATUS_LABEL,
  MANUTENCAO_TIPO_LABEL,
  DOCUMENTO_TIPO_LABEL,
  VENCIMENTO_STATUS_LABEL,
  VENCIMENTO_STATUS_BADGE_CLASS,
  type ManutencaoFrota,
  type DocumentoFrota,
  type VencimentoStatus,
  type VeiculoStatus,
} from "@/lib/types";
import { deleteManutencao } from "./manutencoes/actions";
import { deleteDocumento } from "./documentos/actions";

const MANUTENCAO_DIAS_ALERTA = 15;
const DOCUMENTO_DIAS_ALERTA = 30;

function vencimentoStatus(value: string, diasAlerta: number): VencimentoStatus {
  const dias = diasEntre(value);
  if (dias < 0) return "vencido";
  if (dias <= diasAlerta) return "proximo";
  return "ok";
}

type VeiculoHeader = {
  id: string;
  placa: string;
  modelo: string | null;
  ano: number | null;
  status: VeiculoStatus;
};

export default async function VeiculoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: veiculo }, { data: manutencoes }, { data: documentos }] = await Promise.all([
    supabase
      .from("veiculos_frota")
      .select("id, placa, modelo, ano, status")
      .eq("id", id)
      .maybeSingle<VeiculoHeader>(),
    supabase
      .from("manutencoes_frota")
      .select("id, veiculo_id, tipo, data_realizada, data_proxima, custo, observacoes, created_at")
      .eq("veiculo_id", id)
      .order("data_realizada", { ascending: false })
      .returns<ManutencaoFrota[]>(),
    supabase
      .from("documentos_frota")
      .select("id, veiculo_id, tipo, numero, vencimento, observacoes, created_at")
      .eq("veiculo_id", id)
      .order("vencimento", { ascending: true })
      .returns<DocumentoFrota[]>(),
  ]);

  if (!veiculo) notFound();

  const listaManutencoes = manutencoes ?? [];
  const listaDocumentos = documentos ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {veiculo.placa}
            </h1>
            <Badge className={VEICULO_STATUS_BADGE_CLASS[veiculo.status]}>
              {VEICULO_STATUS_LABEL[veiculo.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {veiculo.modelo ?? "—"}
            {veiculo.ano ? ` · ${veiculo.ano}` : ""}
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href={`/frota/${id}/editar`} />}
          nativeButton={false}
        >
          Editar veículo
        </Button>
      </div>

      <PanelCard
        title="Manutenções"
        action={
          <Button
            variant="brand"
            size="sm"
            render={<Link href={`/frota/${id}/manutencoes/nova`} />}
            nativeButton={false}
          >
            <Plus />
            Nova manutenção
          </Button>
        }
      >
        {listaManutencoes.length === 0 ? (
          <EmptyState
            bare
            icon={Wrench}
            title="Nenhuma manutenção registrada"
            description="Registre a primeira manutenção deste veículo."
          />
        ) : (
          <Card>
            <CardContent className="px-0">
              <div className="flex flex-col gap-3 px-4 sm:hidden">
                {listaManutencoes.map((item) => {
                  const status = item.data_proxima
                    ? vencimentoStatus(item.data_proxima, MANUTENCAO_DIAS_ALERTA)
                    : null;
                  return (
                    <Card key={item.id}>
                      <CardContent className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {MANUTENCAO_TIPO_LABEL[item.tipo]}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(item.data_realizada)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm text-muted-foreground">
                            {item.data_proxima ? (
                              <>
                                Próxima: {formatDate(item.data_proxima)}{" "}
                                {status ? (
                                  <Badge className={VENCIMENTO_STATUS_BADGE_CLASS[status]}>
                                    {VENCIMENTO_STATUS_LABEL[status]}
                                  </Badge>
                                ) : null}
                              </>
                            ) : (
                              "Sem próxima data"
                            )}
                          </div>
                          {item.custo != null ? (
                            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                              {formatCurrency(item.custo)}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/frota/${id}/manutencoes/${item.id}/editar`} />}
                            nativeButton={false}
                          >
                            Editar
                          </Button>
                          <DeleteButton
                            action={deleteManutencao.bind(null, item.id, id)}
                            confirmMessage="Excluir esta manutenção? Essa ação não pode ser desfeita."
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Realizada em</TableHead>
                    <TableHead>Próxima</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaManutencoes.map((item) => {
                    const status = item.data_proxima
                      ? vencimentoStatus(item.data_proxima, MANUTENCAO_DIAS_ALERTA)
                      : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {MANUTENCAO_TIPO_LABEL[item.tipo]}
                        </TableCell>
                        <TableCell>{formatDate(item.data_realizada)}</TableCell>
                        <TableCell>
                          {item.data_proxima ? (
                            <div className="flex items-center gap-2">
                              {formatDate(item.data_proxima)}
                              {status ? (
                                <Badge className={VENCIMENTO_STATUS_BADGE_CLASS[status]}>
                                  {VENCIMENTO_STATUS_LABEL[status]}
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {item.custo != null ? formatCurrency(item.custo) : "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {item.observacoes ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              render={<Link href={`/frota/${id}/manutencoes/${item.id}/editar`} />}
                              nativeButton={false}
                            >
                              Editar
                            </Button>
                            <DeleteButton
                              action={deleteManutencao.bind(null, item.id, id)}
                              confirmMessage="Excluir esta manutenção? Essa ação não pode ser desfeita."
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PanelCard>

      <PanelCard
        title="Documentos"
        action={
          <Button
            variant="brand"
            size="sm"
            render={<Link href={`/frota/${id}/documentos/novo`} />}
            nativeButton={false}
          >
            <Plus />
            Novo documento
          </Button>
        }
      >
        {listaDocumentos.length === 0 ? (
          <EmptyState
            bare
            icon={FileText}
            title="Nenhum documento cadastrado"
            description="Cadastre o primeiro documento deste veículo."
          />
        ) : (
          <Card>
            <CardContent className="px-0">
              <div className="flex flex-col gap-3 px-4 sm:hidden">
                {listaDocumentos.map((item) => {
                  const status = vencimentoStatus(item.vencimento, DOCUMENTO_DIAS_ALERTA);
                  return (
                    <Card key={item.id}>
                      <CardContent className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {DOCUMENTO_TIPO_LABEL[item.tipo]}
                          </span>
                          <Badge className={VENCIMENTO_STATUS_BADGE_CLASS[status]}>
                            {VENCIMENTO_STATUS_LABEL[status]}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Vence em {formatDate(item.vencimento)}
                          {item.numero ? ` · Nº ${item.numero}` : ""}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/frota/${id}/documentos/${item.id}/editar`} />}
                            nativeButton={false}
                          >
                            Editar
                          </Button>
                          <DeleteButton
                            action={deleteDocumento.bind(null, item.id, id)}
                            confirmMessage="Excluir este documento? Essa ação não pode ser desfeita."
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaDocumentos.map((item) => {
                    const status = vencimentoStatus(item.vencimento, DOCUMENTO_DIAS_ALERTA);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{DOCUMENTO_TIPO_LABEL[item.tipo]}</TableCell>
                        <TableCell>{item.numero ?? "—"}</TableCell>
                        <TableCell>{formatDate(item.vencimento)}</TableCell>
                        <TableCell>
                          <Badge className={VENCIMENTO_STATUS_BADGE_CLASS[status]}>
                            {VENCIMENTO_STATUS_LABEL[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {item.observacoes ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              render={<Link href={`/frota/${id}/documentos/${item.id}/editar`} />}
                              nativeButton={false}
                            >
                              Editar
                            </Button>
                            <DeleteButton
                              action={deleteDocumento.bind(null, item.id, id)}
                              confirmMessage="Excluir este documento? Essa ação não pode ser desfeita."
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PanelCard>
    </div>
  );
}
