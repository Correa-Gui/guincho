import { LANCAMENTO_CATEGORIAS, type LancamentoTipo } from "@/lib/types";
import type { ComprovanteExtraido, MensagemInterpretada } from "@/lib/ai";
import type { RascunhoPayload } from "./types";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function categoriaValida(tipo: LancamentoTipo, categoria: string | null): string {
  const opcoes: readonly string[] = LANCAMENTO_CATEGORIAS[tipo];
  if (categoria && opcoes.includes(categoria)) return categoria;
  return "Outros";
}

/** Foto de comprovante = sempre despesa. */
export function normalizarComprovante(extraido: ComprovanteExtraido): RascunhoPayload {
  return {
    tipo: "despesa",
    valor: extraido.valor !== null ? arredondar(extraido.valor) : null,
    categoria: categoriaValida("despesa", extraido.categoria),
    data: extraido.data ?? hojeISO(),
    descricao: extraido.descricao,
    estabelecimento: extraido.estabelecimento,
  };
}

/**
 * Áudio/texto interpretados. `tipoForcado` é usado quando o texto começa
 * com um comando explícito (/gasto ou /ganho) — nesse caso o comando manda,
 * independente do que a IA inferir como intenção.
 */
export function normalizarMensagem(
  interpretado: MensagemInterpretada,
  tipoForcado?: LancamentoTipo,
): RascunhoPayload | null {
  const tipo =
    tipoForcado ??
    (interpretado.intencao === "receita"
      ? "receita"
      : interpretado.intencao === "despesa"
        ? "despesa"
        : null);

  if (!tipo) return null;

  return {
    tipo,
    valor: interpretado.valor !== null ? arredondar(interpretado.valor) : null,
    categoria: categoriaValida(tipo, interpretado.categoria),
    data: interpretado.data ?? hojeISO(),
    descricao: interpretado.descricao,
  };
}

/**
 * Aplica uma correção sobre um rascunho existente: campos não-nulos na
 * interpretação sobrescrevem os do rascunho atual; o resto é preservado.
 */
export function aplicarCorrecao(
  atual: RascunhoPayload,
  correcao: MensagemInterpretada,
): RascunhoPayload {
  const tipo: LancamentoTipo =
    correcao.intencao === "receita" ? "receita" : correcao.intencao === "despesa" ? "despesa" : atual.tipo;

  return {
    tipo,
    valor: correcao.valor !== null ? arredondar(correcao.valor) : atual.valor,
    categoria: correcao.categoria ? categoriaValida(tipo, correcao.categoria) : atual.categoria,
    data: correcao.data ?? atual.data,
    descricao: correcao.descricao ?? atual.descricao,
    estabelecimento: atual.estabelecimento,
  };
}

/** Verdadeiro se a correção não trouxe nenhuma informação nova aproveitável. */
export function correcaoVazia(correcao: MensagemInterpretada): boolean {
  return (
    correcao.valor === null &&
    correcao.categoria === null &&
    correcao.data === null &&
    correcao.descricao === null
  );
}
