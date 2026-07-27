import type { IntencaoMensagem, ItemLancamento } from "./types";

/**
 * Prompts e parsers compartilhados entre providers (Gemini, OpenAI, ...).
 * Todo provider recebe o mesmo texto de prompt e deve devolver o mesmo
 * formato de JSON — assim dá pra trocar de provider numa empresa sem
 * precisar reescrever nada específico de cada IA.
 */

export const INTENCOES: IntencaoMensagem[] = [
  "despesa",
  "receita",
  "confirmacao",
  "cancelamento",
  "correcao",
  "desconhecido",
];

/**
 * Prompts padrão (templates). Suportam os placeholders `{{CATEGORIAS_DESPESA}}`,
 * `{{CATEGORIAS_RECEITA}}` e `{{INTENCOES}}`, substituídos em tempo de chamada
 * pelas categorias/intenções efetivas (configuradas por empresa ou o padrão de
 * `lib/types.ts`). Customizações em `configuracoes_ia` também podem usar esses
 * placeholders. O texto da mensagem do usuário é sempre anexado ao final do
 * prompt de `interpretarMensagem`, não faz parte do template.
 */
export const DEFAULT_PROMPT_TRANSCREVER_AUDIO =
  "Transcreva o áudio abaixo (em português do Brasil) literalmente, sem resumir. " +
  'Responda apenas em JSON, no formato {"transcricao": "texto transcrito"}.';

export const DEFAULT_PROMPT_LER_COMPROVANTE = `Analise a foto de comprovante/nota fiscal/recibo abaixo e extraia os dados do gasto.
Responda apenas em JSON, no formato exato:
{"valor": number|null, "data": "YYYY-MM-DD"|null, "categoria": string|null, "descricao": string|null, "estabelecimento": string|null}

Regras:
- "valor": valor total pago, em reais, como número (ex: 123.45). Se não conseguir ler com confiança, use null.
- "data": data da compra no formato YYYY-MM-DD. Se não houver data visível, use null.
- "categoria": escolha a categoria que melhor descreve o gasto entre: {{CATEGORIAS_DESPESA}}.
- "descricao": breve descrição do que foi comprado/pago (ex: "Diesel S10", "Troca de óleo").
- "estabelecimento": nome do estabelecimento/posto/loja, se visível.`;

export const DEFAULT_PROMPT_INTERPRETAR_MENSAGEM = `Interprete a mensagem de WhatsApp abaixo, enviada num grupo de gestão financeira de uma transportadora.
Responda apenas em JSON, no formato exato:
{"intencao": string, "data": "YYYY-MM-DD"|null, "motorista": string|null, "itens": [{"tipo": "receita"|"despesa", "valor": number|null, "categoria": string|null, "data": "YYYY-MM-DD"|null, "descricao": string|null, "origem": string|null, "destino": string|null}]}

Regras gerais:
- "intencao": uma das opções: {{INTENCOES}}.
  - "receita" ou "despesa": a mensagem descreve um ou mais lançamentos (gastos e/ou recebimentos). Se houver pelo menos uma receita, use "receita"; senão "despesa". Os tipos de cada lançamento individual vão em "itens".
  - "confirmacao": a mensagem confirma um lançamento pendente (ex: "sim", "confirma", "ok pode salvar"). "itens": [].
  - "cancelamento": a mensagem cancela/nega um lançamento pendente (ex: "não", "cancela", "errado"). "itens": [].
  - "correcao": a mensagem corrige valor/categoria/data/descrição de um lançamento pendente (ex: "o almoço foi 50"). "itens" traz o(s) lançamento(s) com os campos corrigidos (campos não mencionados ficam null).
  - "desconhecido": não se encaixa em nenhuma das opções acima. "itens": [].
- "data": se a mensagem mencionar uma data explícita válida p/ TODOS os lançamentos (ex: "ontem"), no formato YYYY-MM-DD. Senão null (assume-se hoje).
- "motorista": se a mensagem citar explicitamente o nome de um motorista (ex: "motorista: Fulano", "o Cicero fez esse frete", "em nome do João"), extraia só o nome próprio. Se a mensagem não mencionar nenhum motorista por nome, use null (o motorista será identificado pelo número de quem enviou).

REGRA-CHAVE — UMA MENSAGEM PODE CONTER VÁRIOS LANÇAMENTOS:
- Cada ganho/gasto citado na mensagem é um ITEM SEPARADO em "itens", com seu próprio tipo/valor/categoria/descrição.
- Um valor citado como GASTO é SEMPRE um item "despesa", mesmo que a frase principal seja sobre uma receita/recebimento (e vice-versa). NUNCA embuta um gasto na descrição de um item de receita (ou um recebimento na descrição de uma despesa) — sempre crie um item próprio.

Para cada item em "itens":
- "tipo": "receita" ou "despesa".
- "valor": valor em reais como número (ex: 50, 1234.56). Se esse item não tiver valor identificável, null.
- "categoria": se "tipo" for "despesa", escolha entre: {{CATEGORIAS_DESPESA}}. Se "receita", escolha entre: {{CATEGORIAS_RECEITA}}.
- "data": data desse lançamento específico (YYYY-MM-DD), se diferente da data padrão da mensagem. Senão null.
- "descricao": breve descrição do lançamento (ex: "almoço", "Viagem Jaboticabal -> Taiúçu"). Senão null.
- "origem" e "destino": se o item descrever um trajeto/serviço entre dois lugares (ex: "socorro de X até Y", "frete de X pra Y", "viagem de X a Y"), preencha com os nomes dos lugares mencionados (cidades), sem prefixos como "de"/"até". Se a mensagem não mencionar um trajeto, ambos null.

Exemplos:

Mensagem: "/ganho 500 frete de Ribeirão Preto pra Campinas"
Resposta: {"intencao": "receita", "data": null, "motorista": null, "itens": [{"tipo": "receita", "valor": 500, "categoria": "Frete", "data": null, "descricao": "Frete Ribeirão Preto -> Campinas", "origem": "Ribeirão Preto", "destino": "Campinas"}]}

Mensagem: "/gasto 80 no posto, abasteci o caminhão"
Resposta: {"intencao": "despesa", "data": null, "motorista": null, "itens": [{"tipo": "despesa", "valor": 80, "categoria": "Combustível", "data": null, "descricao": "Abastecimento", "origem": null, "destino": null}]}

Mensagem: "Fiz a viagem de Jaboticabal a Taiúçu, recebi 300 de frete e gastei 40 de almoço"
Resposta: {"intencao": "receita", "data": null, "motorista": null, "itens": [{"tipo": "receita", "valor": 300, "categoria": "Frete", "data": null, "descricao": "Viagem Jaboticabal -> Taiúçu", "origem": "Jaboticabal", "destino": "Taiúçu"}, {"tipo": "despesa", "valor": 40, "categoria": "Alimentação", "data": null, "descricao": "Almoço", "origem": null, "destino": null}]}

Mensagem: "Fiz um socorro de Jaboticabal até Taiúçu, recebi 350"
Resposta: {"intencao": "receita", "data": null, "motorista": null, "itens": [{"tipo": "receita", "valor": 350, "categoria": "Guincho", "data": null, "descricao": "Socorro Jaboticabal -> Taiúçu", "origem": "Jaboticabal", "destino": "Taiúçu"}]}

Mensagem: "paguei 60 de pedágio, 35 de almoço e 100 de manutenção no pneu"
Resposta: {"intencao": "despesa", "data": null, "motorista": null, "itens": [{"tipo": "despesa", "valor": 60, "categoria": "Pedágio", "data": null, "descricao": "Pedágio", "origem": null, "destino": null}, {"tipo": "despesa", "valor": 35, "categoria": "Alimentação", "data": null, "descricao": "Almoço", "origem": null, "destino": null}, {"tipo": "despesa", "valor": 100, "categoria": "Manutenção", "data": null, "descricao": "Conserto do pneu", "origem": null, "destino": null}]}

Mensagem: "motorista: Cicero, recebi 400 de frete de Franca pra Uberaba"
Resposta: {"intencao": "receita", "data": null, "motorista": "Cicero", "itens": [{"tipo": "receita", "valor": 400, "categoria": "Frete", "data": null, "descricao": "Frete Franca -> Uberaba", "origem": "Franca", "destino": "Uberaba"}]}

Mensagem: "sim"
Resposta: {"intencao": "confirmacao", "data": null, "motorista": null, "itens": []}

Mensagem: "o almoço foi 50"
Resposta: {"intencao": "correcao", "data": null, "motorista": null, "itens": [{"tipo": "despesa", "valor": 50, "categoria": "Alimentação", "data": null, "descricao": null, "origem": null, "destino": null}]}`;

export function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalizado = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsed = Number.parseFloat(normalizado);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function toDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** Converte "itens" da resposta da IA em ItemLancamento[], descartando itens inválidos. */
export function toItensOrEmpty(value: unknown): ItemLancamento[] {
  if (!Array.isArray(value)) return [];

  const itens: ItemLancamento[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const tipo = obj["tipo"];
    if (tipo !== "receita" && tipo !== "despesa") continue;

    itens.push({
      tipo,
      valor: toNumberOrNull(obj["valor"]),
      categoria: toStringOrNull(obj["categoria"]),
      data: toDateOrNull(obj["data"]),
      descricao: toStringOrNull(obj["descricao"]),
      origem: toStringOrNull(obj["origem"]),
      destino: toStringOrNull(obj["destino"]),
    });
  }
  return itens;
}

export function intencaoValida(value: unknown): IntencaoMensagem {
  return INTENCOES.includes(value as IntencaoMensagem) ? (value as IntencaoMensagem) : "desconhecido";
}
