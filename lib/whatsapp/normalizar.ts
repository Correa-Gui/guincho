import { LANCAMENTO_CATEGORIAS, type ItemRascunho, type LancamentoTipo } from "@/lib/types";
import { validarPlaca } from "@/lib/format";
import type { ComprovanteExtraido, ItemLancamento, MensagemInterpretada } from "@/lib/ai";
import type { RascunhoPayload } from "./types";

/** Categorias válidas por tipo, configuráveis por empresa (ver `categoriasDaConfiguracao`). */
export type Categorias = { receita: readonly string[]; despesa: readonly string[] };

const CATEGORIAS_PADRAO: Categorias = LANCAMENTO_CATEGORIAS;

/**
 * Data de hoje no fuso de Brasília (não UTC). Mensagens enviadas à noite
 * (depois de ~21h em horário de verão inexistente/BRT -03:00) cairiam no dia
 * seguinte se usássemos `new Date().toISOString()`, que é sempre UTC.
 */
export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function categoriaValida(tipo: LancamentoTipo, categoria: string | null, categorias: Categorias): string {
  const opcoes = categorias[tipo];
  if (categoria && opcoes.includes(categoria)) return categoria;
  return "Outros";
}

/** Foto de comprovante = sempre despesa, sempre 1 item. */
export function normalizarComprovante(extraido: ComprovanteExtraido, categorias: Categorias = CATEGORIAS_PADRAO): RascunhoPayload {
  return {
    itens: [
      {
        tipo: "despesa",
        valor: extraido.valor !== null ? arredondar(extraido.valor) : null,
        categoria: categoriaValida("despesa", extraido.categoria, categorias),
        data: extraido.data ?? hojeISO(),
        descricao: extraido.descricao,
        estabelecimento: extraido.estabelecimento,
      },
    ],
    motorista: null,
  };
}

function normalizarItem(
  item: ItemLancamento,
  dataPadrao: string,
  categorias: Categorias,
  tipoForcado?: LancamentoTipo,
): ItemRascunho {
  const tipo = tipoForcado ?? item.tipo;
  return {
    tipo,
    valor: item.valor !== null ? arredondar(item.valor) : null,
    categoria: categoriaValida(tipo, item.categoria, categorias),
    data: item.data ?? dataPadrao,
    descricao: item.descricao,
    origem: item.origem,
    destino: item.destino,
    segurado: item.segurado,
    placaCliente: item.placaCliente ? validarPlaca(item.placaCliente).normalizada : null,
  };
}

/**
 * Áudio/texto interpretados. Uma mensagem pode conter vários lançamentos
 * (ex: receita do frete + despesa do almoço), cada um virando um item de
 * `itens`. `tipoForcado` é usado quando o texto começa com um comando
 * explícito (/gasto ou /ganho) — nesse caso o comando manda e é aplicado a
 * TODOS os itens, independente do que a IA inferir como tipo.
 */
export function normalizarMensagem(
  interpretado: MensagemInterpretada,
  tipoForcado?: LancamentoTipo,
  categorias: Categorias = CATEGORIAS_PADRAO,
): RascunhoPayload | null {
  if (interpretado.itens.length === 0) return null;

  const dataPadrao = interpretado.data ?? hojeISO();
  const itens = interpretado.itens.map((item) => normalizarItem(item, dataPadrao, categorias, tipoForcado));

  return { itens, motorista: interpretado.motorista };
}

/**
 * Aplica uma correção sobre um rascunho existente. Cada item da correção é
 * casado com um item do rascunho pela categoria mencionada; se não houver
 * categoria ou não houver match e o rascunho tiver só 1 item, corrige esse
 * item. Campos não-nulos da correção sobrescrevem os do item; o resto é
 * preservado. Itens sem match são ignorados.
 */
export function aplicarCorrecao(
  atual: RascunhoPayload,
  correcao: MensagemInterpretada,
  categorias: Categorias = CATEGORIAS_PADRAO,
): RascunhoPayload {
  if (correcao.itens.length === 0) return atual;

  const itens = atual.itens.map((item) => ({ ...item }));

  for (const corrItem of correcao.itens) {
    let idx = corrItem.categoria ? itens.findIndex((item) => item.categoria === corrItem.categoria) : -1;
    if (idx === -1 && itens.length === 1) idx = 0;
    if (idx === -1) continue;

    const atualItem = itens[idx];
    const tipo = corrItem.tipo ?? atualItem.tipo;

    itens[idx] = {
      ...atualItem,
      tipo,
      valor: corrItem.valor !== null ? arredondar(corrItem.valor) : atualItem.valor,
      categoria: corrItem.categoria ? categoriaValida(tipo, corrItem.categoria, categorias) : atualItem.categoria,
      data: corrItem.data ?? atualItem.data,
      descricao: corrItem.descricao ?? atualItem.descricao,
    };
  }

  return { itens, motorista: correcao.motorista ?? atual.motorista };
}

/** Verdadeiro se a correção não trouxe nenhuma informação nova aproveitável. */
export function correcaoVazia(correcao: MensagemInterpretada): boolean {
  if (correcao.itens.length === 0) return true;
  return correcao.itens.every(
    (item) => item.valor === null && item.categoria === null && item.data === null && item.descricao === null,
  );
}

/** Verdadeiro se todos os itens do rascunho têm valor > 0 (pronto para salvar). */
export function payloadCompleto(payload: RascunhoPayload): boolean {
  return payload.itens.length > 0 && payload.itens.every((item) => item.valor !== null && item.valor > 0);
}
