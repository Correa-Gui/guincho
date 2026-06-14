import Link from "next/link";
import { Plus, Wallet, Receipt, Repeat, Pause, Play } from "lucide-react";
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
import { gerarLancamentosDoMes } from "@/lib/contas-fixas";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  CONTA_STATUS_BADGE_CLASS,
  CONTA_STATUS_LABEL,
  LANCAMENTO_TIPO_BADGE_CLASS,
  LANCAMENTO_TIPO_LABEL,
  type ContaAReceber,
  type ContaFixa,
  type LancamentoFinanceiro,
} from "@/lib/types";
import { deleteConta, deleteLancamento, deleteContaFixa, toggleContaFixa } from "./actions";

export default async function FinanceiroPage() {
  const supabase = await createClient();

  await gerarLancamentosDoMes(supabase);

  const [{ data: lancamentos }, { data: contas }, { data: contasFixas }] = await Promise.all([
    supabase
      .from("lancamentos_financeiros")
      .select("id, viagem_id, tipo, categoria, valor, descricao, data, created_at, viagens(id, origem, destino)")
      .order("data", { ascending: false })
      .returns<LancamentoFinanceiro[]>(),
    supabase
      .from("contas_a_receber")
      .select("id, viagem_id, cliente_id, valor, vencimento, status, created_at, clientes(nome), viagens(id, origem, destino)")
      .order("vencimento", { ascending: true })
      .returns<ContaAReceber[]>(),
    supabase
      .from("contas_fixas")
      .select("id, descricao, tipo, categoria, valor, dia_vencimento, ativo, created_at")
      .order("dia_vencimento", { ascending: true })
      .returns<ContaFixa[]>(),
  ]);

  const listaLancamentos = lancamentos ?? [];
  const listaContas = contas ?? [];
  const listaContasFixas = contasFixas ?? [];

  const totalFixoDespesa = listaContasFixas
    .filter((c) => c.ativo && c.tipo === "despesa")
    .reduce((total, c) => total + c.valor, 0);
  const totalFixoReceita = listaContasFixas
    .filter((c) => c.ativo && c.tipo === "receita")
    .reduce((total, c) => total + c.valor, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Financeiro
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lançamentos de caixa e contas a receber.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle>Lançamentos</CardTitle>
          <Button
            size="sm"
            variant="brand"
            render={<Link href="/financeiro/lancamentos/novo" />}
          >
            <Plus />
            Novo lançamento
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {listaLancamentos.length === 0 ? (
            <EmptyState
              bare
              icon={Wallet}
              title="Nenhum lançamento cadastrado ainda"
              description="Registre receitas e despesas para acompanhar o caixa."
            />
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-3 px-4 sm:hidden">
                {listaLancamentos.map((lancamento) => (
                  <Card key={lancamento.id}>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {formatDate(lancamento.data)}
                        </span>
                        <Badge className={LANCAMENTO_TIPO_BADGE_CLASS[lancamento.tipo]}>
                          {LANCAMENTO_TIPO_LABEL[lancamento.tipo]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{lancamento.categoria}</div>
                      {lancamento.descricao ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {lancamento.descricao}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-base font-semibold tabular-nums ${lancamento.tipo === "receita" ? "text-pos" : "text-neg"}`}
                        >
                          {lancamento.tipo === "despesa" ? "- " : ""}
                          {formatCurrency(lancamento.valor)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/financeiro/lancamentos/${lancamento.id}/editar`} />}
                          >
                            Editar
                          </Button>
                          <DeleteButton
                            action={deleteLancamento.bind(null, lancamento.id)}
                            confirmMessage="Excluir este lançamento? Essa ação não pode ser desfeita."
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaLancamentos.map((lancamento) => (
                    <TableRow key={lancamento.id}>
                      <TableCell>{formatDate(lancamento.data)}</TableCell>
                      <TableCell>
                        <Badge className={LANCAMENTO_TIPO_BADGE_CLASS[lancamento.tipo]}>
                          {LANCAMENTO_TIPO_LABEL[lancamento.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{lancamento.categoria}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {lancamento.descricao ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        <span className={lancamento.tipo === "receita" ? "text-pos" : "text-neg"}>
                          {lancamento.tipo === "despesa" ? "- " : ""}
                          {formatCurrency(lancamento.valor)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/financeiro/lancamentos/${lancamento.id}/editar`} />}
                          >
                            Editar
                          </Button>
                          <DeleteButton
                            action={deleteLancamento.bind(null, lancamento.id)}
                            confirmMessage="Excluir este lançamento? Essa ação não pode ser desfeita."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle>Contas a receber</CardTitle>
          <Button
            size="sm"
            variant="brand"
            render={<Link href="/financeiro/contas/nova" />}
          >
            <Plus />
            Nova conta
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {listaContas.length === 0 ? (
            <EmptyState
              bare
              icon={Receipt}
              title="Nenhuma conta a receber cadastrada ainda"
              description="Contas vinculadas a viagens aparecerão aqui."
            />
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-3 px-4 sm:hidden">
                {listaContas.map((conta) => (
                  <Card key={conta.id}>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {formatDate(conta.vencimento)}
                        </span>
                        <Badge className={CONTA_STATUS_BADGE_CLASS[conta.status]}>
                          {CONTA_STATUS_LABEL[conta.status]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {conta.clientes?.nome ?? "—"}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                          {formatCurrency(conta.valor)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/financeiro/contas/${conta.id}/editar`} />}
                          >
                            Editar
                          </Button>
                          <DeleteButton
                            action={deleteConta.bind(null, conta.id)}
                            confirmMessage="Excluir esta conta? Essa ação não pode ser desfeita."
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
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaContas.map((conta) => (
                    <TableRow key={conta.id}>
                      <TableCell>{formatDate(conta.vencimento)}</TableCell>
                      <TableCell>{conta.clientes?.nome ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(conta.valor)}
                      </TableCell>
                      <TableCell>
                        <Badge className={CONTA_STATUS_BADGE_CLASS[conta.status]}>
                          {CONTA_STATUS_LABEL[conta.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/financeiro/contas/${conta.id}/editar`} />}
                          >
                            Editar
                          </Button>
                          <DeleteButton
                            action={deleteConta.bind(null, conta.id)}
                            confirmMessage="Excluir esta conta? Essa ação não pode ser desfeita."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Contas fixas</CardTitle>
            {listaContasFixas.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Gastos fixos: {formatCurrency(totalFixoDespesa)}/mês
                {totalFixoReceita > 0 ? ` · Receitas fixas: ${formatCurrency(totalFixoReceita)}/mês` : ""}
              </p>
            ) : null}
          </div>
          <Button size="sm" variant="brand" render={<Link href="/financeiro/fixas/nova" />}>
            <Plus />
            Nova conta fixa
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {listaContasFixas.length === 0 ? (
            <EmptyState
              bare
              icon={Repeat}
              title="Nenhuma conta fixa cadastrada ainda"
              description="Cadastre aluguel, internet e outras contas recorrentes para acompanhar seus gastos fixos mensais."
            />
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="flex flex-col gap-3 px-4 sm:hidden">
                {listaContasFixas.map((conta) => (
                  <Card key={conta.id} className={conta.ativo ? undefined : "opacity-60"}>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {conta.descricao}
                        </span>
                        <Badge className={LANCAMENTO_TIPO_BADGE_CLASS[conta.tipo]}>
                          {LANCAMENTO_TIPO_LABEL[conta.tipo]}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {conta.categoria} · vence dia {conta.dia_vencimento}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-base font-semibold tabular-nums ${conta.tipo === "receita" ? "text-pos" : "text-neg"}`}
                        >
                          {conta.tipo === "despesa" ? "- " : ""}
                          {formatCurrency(conta.valor)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/financeiro/fixas/${conta.id}/editar`} />}
                          >
                            Editar
                          </Button>
                          <DeleteButton
                            action={deleteContaFixa.bind(null, conta.id)}
                            confirmMessage="Excluir esta conta fixa? Essa ação não pode ser desfeita."
                          />
                        </div>
                      </div>
                      <form action={toggleContaFixa.bind(null, conta.id, conta.ativo)}>
                        <Button type="submit" variant="ghost" size="sm" className="w-full">
                          {conta.ativo ? (
                            <>
                              <Pause /> Pausar
                            </>
                          ) : (
                            <>
                              <Play /> Reativar
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop: table */}
              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaContasFixas.map((conta) => (
                    <TableRow key={conta.id} className={conta.ativo ? undefined : "opacity-60"}>
                      <TableCell className="font-medium">{conta.descricao}</TableCell>
                      <TableCell>
                        <Badge className={LANCAMENTO_TIPO_BADGE_CLASS[conta.tipo]}>
                          {LANCAMENTO_TIPO_LABEL[conta.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{conta.categoria}</TableCell>
                      <TableCell>Dia {conta.dia_vencimento}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        <span className={conta.tipo === "receita" ? "text-pos" : "text-neg"}>
                          {conta.tipo === "despesa" ? "- " : ""}
                          {formatCurrency(conta.valor)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form action={toggleContaFixa.bind(null, conta.id, conta.ativo)}>
                            <Button type="submit" variant="ghost" size="sm">
                              {conta.ativo ? (
                                <>
                                  <Pause /> Pausar
                                </>
                              ) : (
                                <>
                                  <Play /> Reativar
                                </>
                              )}
                            </Button>
                          </form>
                          <Button
                            variant="outline"
                            size="sm"
                            render={<Link href={`/financeiro/fixas/${conta.id}/editar`} />}
                          >
                            Editar
                          </Button>
                          <DeleteButton
                            action={deleteContaFixa.bind(null, conta.id)}
                            confirmMessage="Excluir esta conta fixa? Essa ação não pode ser desfeita."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
