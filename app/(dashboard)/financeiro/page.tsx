import { Wallet, Receipt, Repeat, Pause, Play } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NovoLancamentoButton, NovaContaButton, NovaContaFixaButton } from "@/components/financeiro/financeiro-buttons";
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
import { TableFilters } from "@/components/shared/table-filters";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { createClient } from "@/lib/supabase/server";
import { gerarLancamentosDoMes } from "@/lib/contas-fixas";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  CONTA_STATUS_BADGE_CLASS,
  CONTA_STATUS_LABEL,
  LANCAMENTO_CATEGORIAS,
  LANCAMENTO_TIPO_BADGE_CLASS,
  LANCAMENTO_TIPO_LABEL,
  type ContaAReceber,
  type ContaFixa,
  type LancamentoFinanceiro,
  type LancamentoTipo,
} from "@/lib/types";
import { deleteConta, deleteLancamento, deleteContaFixa, toggleContaFixa } from "./actions";

const PAGE_SIZE = 10;

type SearchParams = Record<string, string | string[] | undefined>;

function param(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function buildHref(searchParams: SearchParams, pageParam: string, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }
  params.set(pageParam, String(page));
  return `?${params.toString()}`;
}

function hiddenParams(searchParams: SearchParams, exclude: string[]) {
  const hidden: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (exclude.includes(key)) continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (first) hidden[key] = first;
  }
  return hidden;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  await gerarLancamentosDoMes(supabase);

  const lancPage = parsePage(param(sp, "lpag"));
  const lancTipo = param(sp, "ltipo");
  const lancCategoria = param(sp, "lcat");

  const contaPage = parsePage(param(sp, "cpag"));
  const contaStatus = param(sp, "cstatus");

  const fixaPage = parsePage(param(sp, "fpag"));
  const fixaTipo = param(sp, "ftipo");
  const fixaAtivo = param(sp, "fativo");

  let lancQuery = supabase
    .from("lancamentos_financeiros")
    .select(
      "id, viagem_id, motorista_id, tipo, categoria, valor, descricao, data, created_at, viagens(id, origem, destino), motoristas(nome)",
      { count: "exact" },
    )
    .order("data", { ascending: false });
  if (lancTipo) lancQuery = lancQuery.eq("tipo", lancTipo);
  if (lancCategoria) lancQuery = lancQuery.eq("categoria", lancCategoria);
  const lancFrom = (lancPage - 1) * PAGE_SIZE;
  lancQuery = lancQuery.range(lancFrom, lancFrom + PAGE_SIZE - 1);

  let contaQuery = supabase
    .from("contas_a_receber")
    .select(
      "id, viagem_id, cliente_id, valor, vencimento, status, created_at, clientes(nome), viagens(id, origem, destino)",
      { count: "exact" },
    )
    .order("vencimento", { ascending: true });
  if (contaStatus) contaQuery = contaQuery.eq("status", contaStatus);
  const contaFrom = (contaPage - 1) * PAGE_SIZE;
  contaQuery = contaQuery.range(contaFrom, contaFrom + PAGE_SIZE - 1);

  let fixaQuery = supabase
    .from("contas_fixas")
    .select("id, descricao, tipo, categoria, valor, dia_vencimento, ativo, created_at", {
      count: "exact",
    })
    .order("dia_vencimento", { ascending: true });
  if (fixaTipo) fixaQuery = fixaQuery.eq("tipo", fixaTipo);
  if (fixaAtivo) fixaQuery = fixaQuery.eq("ativo", fixaAtivo === "sim");
  const fixaFrom = (fixaPage - 1) * PAGE_SIZE;
  fixaQuery = fixaQuery.range(fixaFrom, fixaFrom + PAGE_SIZE - 1);

  const [
    { data: lancamentos, count: lancCount },
    { data: contas, count: contaCount },
    { data: contasFixas, count: fixaCount },
    { data: fixasAtivas },
    { data: viagensRef },
    { data: clientes },
    { data: motoristas },
  ] = await Promise.all([
    lancQuery.returns<LancamentoFinanceiro[]>(),
    contaQuery.returns<ContaAReceber[]>(),
    fixaQuery.returns<ContaFixa[]>(),
    supabase
      .from("contas_fixas")
      .select("tipo, valor")
      .eq("ativo", true)
      .returns<{ tipo: LancamentoTipo; valor: number }[]>(),
    supabase
      .from("viagens")
      .select("id, origem, destino")
      .order("data", { ascending: false }),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("motoristas").select("id, nome").eq("ativo", true).order("nome"),
  ]);

  const listaLancamentos = lancamentos ?? [];
  const listaContas = contas ?? [];
  const listaContasFixas = contasFixas ?? [];

  const lancTotalPages = Math.max(1, Math.ceil((lancCount ?? 0) / PAGE_SIZE));
  const contaTotalPages = Math.max(1, Math.ceil((contaCount ?? 0) / PAGE_SIZE));
  const fixaTotalPages = Math.max(1, Math.ceil((fixaCount ?? 0) / PAGE_SIZE));

  const totalFixoDespesa = (fixasAtivas ?? [])
    .filter((c) => c.tipo === "despesa")
    .reduce((total, c) => total + c.valor, 0);
  const totalFixoReceita = (fixasAtivas ?? [])
    .filter((c) => c.tipo === "receita")
    .reduce((total, c) => total + c.valor, 0);

  const categoriaOptions = Array.from(
    new Set([...LANCAMENTO_CATEGORIAS.receita, ...LANCAMENTO_CATEGORIAS.despesa]),
  );

  const lancFiltered = Boolean(lancTipo || lancCategoria);
  const contaFiltered = Boolean(contaStatus);
  const fixaFiltered = Boolean(fixaTipo || fixaAtivo);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Financeiro
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lançamentos de caixa e contas a receber.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/financeiro/historico" />} nativeButton={false}>
          Histórico mensal
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle>Lançamentos</CardTitle>
          <NovoLancamentoButton viagens={viagensRef ?? []} motoristas={motoristas ?? []} />
        </CardHeader>
        <CardContent className="px-0">
          <TableFilters
            hidden={hiddenParams(sp, ["lpag", "ltipo", "lcat"])}
            selects={[
              {
                name: "ltipo",
                label: "Tipo",
                value: lancTipo,
                options: [
                  { value: "", label: "Todos" },
                  { value: "receita", label: "Receita" },
                  { value: "despesa", label: "Despesa" },
                ],
              },
              {
                name: "lcat",
                label: "Categoria",
                value: lancCategoria,
                options: [
                  { value: "", label: "Todas" },
                  ...categoriaOptions.map((categoria) => ({ value: categoria, label: categoria })),
                ],
              },
            ]}
          />
          {listaLancamentos.length === 0 ? (
            <EmptyState
              bare
              icon={Wallet}
              title={
                lancFiltered
                  ? "Nenhum lançamento encontrado para os filtros selecionados"
                  : "Nenhum lançamento cadastrado ainda"
              }
              description={
                lancFiltered
                  ? "Tente ajustar os filtros para ver outros lançamentos."
                  : "Registre receitas e despesas para acompanhar o caixa."
              }
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
                      <div className="text-sm text-muted-foreground">
                        {lancamento.categoria}
                        {lancamento.motoristas?.nome ? ` · ${lancamento.motoristas.nome}` : ""}
                      </div>
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
                            nativeButton={false}
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
                    <TableHead>Motorista</TableHead>
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
                      <TableCell className="text-muted-foreground">
                        {lancamento.motoristas?.nome ?? "—"}
                      </TableCell>
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
                            nativeButton={false}
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
          <PaginationControls
            page={lancPage}
            totalPages={lancTotalPages}
            buildHref={(page) => buildHref(sp, "lpag", page)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle>Contas a receber</CardTitle>
          <NovaContaButton clientes={clientes ?? []} viagens={viagensRef ?? []} />
        </CardHeader>
        <CardContent className="px-0">
          <TableFilters
            hidden={hiddenParams(sp, ["cpag", "cstatus"])}
            selects={[
              {
                name: "cstatus",
                label: "Status",
                value: contaStatus,
                options: [
                  { value: "", label: "Todos" },
                  { value: "pendente", label: "Pendente" },
                  { value: "pago", label: "Pago" },
                  { value: "atrasado", label: "Atrasado" },
                ],
              },
            ]}
          />
          {listaContas.length === 0 ? (
            <EmptyState
              bare
              icon={Receipt}
              title={
                contaFiltered
                  ? "Nenhuma conta encontrada para os filtros selecionados"
                  : "Nenhuma conta a receber cadastrada ainda"
              }
              description={
                contaFiltered
                  ? "Tente ajustar os filtros para ver outras contas."
                  : "Contas vinculadas a viagens aparecerão aqui."
              }
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
                            nativeButton={false}
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
                            nativeButton={false}
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
          <PaginationControls
            page={contaPage}
            totalPages={contaTotalPages}
            buildHref={(page) => buildHref(sp, "cpag", page)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Contas fixas</CardTitle>
            {totalFixoDespesa > 0 || totalFixoReceita > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Gastos fixos: {formatCurrency(totalFixoDespesa)}/mês
                {totalFixoReceita > 0 ? ` · Receitas fixas: ${formatCurrency(totalFixoReceita)}/mês` : ""}
              </p>
            ) : null}
          </div>
          <NovaContaFixaButton />
        </CardHeader>
        <CardContent className="px-0">
          <TableFilters
            hidden={hiddenParams(sp, ["fpag", "ftipo", "fativo"])}
            selects={[
              {
                name: "ftipo",
                label: "Tipo",
                value: fixaTipo,
                options: [
                  { value: "", label: "Todos" },
                  { value: "receita", label: "Receita" },
                  { value: "despesa", label: "Despesa" },
                ],
              },
              {
                name: "fativo",
                label: "Status",
                value: fixaAtivo,
                options: [
                  { value: "", label: "Todos" },
                  { value: "sim", label: "Ativas" },
                  { value: "nao", label: "Pausadas" },
                ],
              },
            ]}
          />
          {listaContasFixas.length === 0 ? (
            <EmptyState
              bare
              icon={Repeat}
              title={
                fixaFiltered
                  ? "Nenhuma conta fixa encontrada para os filtros selecionados"
                  : "Nenhuma conta fixa cadastrada ainda"
              }
              description={
                fixaFiltered
                  ? "Tente ajustar os filtros para ver outras contas fixas."
                  : "Cadastre aluguel, internet e outras contas recorrentes para acompanhar seus gastos fixos mensais."
              }
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
                            nativeButton={false}
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
                            nativeButton={false}
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
          <PaginationControls
            page={fixaPage}
            totalPages={fixaTotalPages}
            buildHref={(page) => buildHref(sp, "fpag", page)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
