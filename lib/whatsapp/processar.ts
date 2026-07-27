import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getAIProvider, AIProviderError, buscarConfiguracaoIA, categoriasDaConfiguracao, type ConfiguracaoIA } from "@/lib/ai";
import { LANCAMENTO_TIPO_LABEL, type ItemRascunho, type LancamentoTipo } from "@/lib/types";
import { formatCurrency, formatDate, validarPlaca } from "@/lib/format";
import { resolverLocalizacao } from "@/lib/enderecos";
import { getRota } from "@/lib/rotas";
import { baixarMidiaMensagem, enviarMensagemTexto, numeroDoJid } from "./evolution";
import {
  aplicarCorrecao,
  correcaoVazia,
  hojeISO,
  normalizarComprovante,
  normalizarMensagem,
  payloadCompleto,
  type Categorias,
} from "./normalizar";
import type { EvolutionMessageKey, EvolutionWebhookBody, RascunhoPayload } from "./types";

const GRUPO_AUTORIZADO = process.env.WHATSAPP_GRUPO_JID;

const COMANDOS: Record<string, LancamentoTipo> = {
  "/gasto": "despesa",
  "/ganho": "receita",
};

const REGEX_CONFIRMA = /^(sim|s|confirma(do)?|confirmar|isso|correto|certo|ok)\b/i;
const REGEX_CANCELA = /^(n[aã]o|n|cancela(r)?|errado|apaga(r)?|descarta(r)?)\b/i;

/** Overrides de IA + categorias efetivas da empresa, resolvidos 1x por mensagem. */
type IAContext = {
  config?: ConfiguracaoIA;
  categorias: Categorias;
};

type RascunhoRow = {
  id: string;
  status: string;
  origem: "whatsapp_audio" | "whatsapp_foto" | "whatsapp_texto";
  payload: RascunhoPayload;
  media_url: string | null;
  motorista_id: string | null;
};

/**
 * Resolve o motorista do lançamento: prioriza o nome citado explicitamente na
 * mensagem (ex: "motorista: Fulano"), com fallback pro telefone de quem
 * enviou a mensagem no grupo (casado contra `motoristas.telefone_normalizado`).
 */
async function resolverMotoristaId(
  supabase: SupabaseClient,
  empresaId: string,
  participant: string,
  motoristaNome: string | null,
): Promise<string | null> {
  if (motoristaNome) {
    const { data } = await supabase
      .from("motoristas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .ilike("nome", `%${motoristaNome}%`)
      .limit(1)
      .maybeSingle();
    if (data) return data.id;
  }

  const numero = numeroDoJid(participant);
  const { data: porTelefone } = await supabase
    .from("motoristas")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("telefone_normalizado", numero)
    .maybeSingle();

  return porTelefone?.id ?? null;
}

/** Ponto de entrada: processa um evento de webhook da Evolution API. */
export async function processarWebhookEvolution(body: EvolutionWebhookBody): Promise<void> {
  if (body.event !== "messages.upsert" || !body.data?.key) return;

  const { key, message, messageType } = body.data;

  if (key.fromMe) return;
  if (!key.remoteJid.endsWith("@g.us")) return;
  if (GRUPO_AUTORIZADO && key.remoteJid !== GRUPO_AUTORIZADO) return;
  if (!key.id) return;

  const supabase = createServiceClient();

  if (!(await marcarComoProcessada(supabase, key.id))) return;

  const { data: grupo } = await supabase
    .from("grupos_whatsapp")
    .select("empresa_id")
    .eq("grupo_jid", key.remoteJid)
    .eq("ativo", true)
    .maybeSingle();

  if (!grupo) return;

  const config = await buscarConfiguracaoIA(supabase, grupo.empresa_id);
  const ia: IAContext = { config, categorias: categoriasDaConfiguracao(config) };

  const participant = key.participant ?? key.remoteJid;
  const texto =
    message?.conversation ?? message?.extendedTextMessage?.text ?? message?.imageMessage?.caption ?? "";

  if (messageType === "audioMessage") {
    await processarAudio(supabase, grupo.empresa_id, key, participant, ia);
  } else if (messageType === "imageMessage") {
    await processarFoto(supabase, grupo.empresa_id, key, participant, ia);
  } else if (messageType === "conversation" || messageType === "extendedTextMessage") {
    await processarTexto(supabase, grupo.empresa_id, key, participant, texto, ia);
  }
}

/** Insere o message_id em whatsapp_mensagens_processadas. false = já processado (ou erro). */
async function marcarComoProcessada(supabase: SupabaseClient, messageId: string): Promise<boolean> {
  const { error } = await supabase.from("whatsapp_mensagens_processadas").insert({ message_id: messageId });
  if (error) {
    if (error.code !== "23505") {
      console.error("[whatsapp] falha ao marcar mensagem como processada", error.message);
    }
    return false;
  }
  return true;
}

async function processarAudio(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  ia: IAContext,
): Promise<void> {
  const midia = await baixarMidiaMensagem(key);
  if (!midia) {
    await criarRascunhoComErro(
      supabase,
      empresaId,
      key,
      participant,
      "whatsapp_audio",
      null,
      "não consegui baixar o áudio",
    );
    return;
  }

  const provider = getAIProvider(ia.config?.provider);
  let payload: RascunhoPayload | null;
  try {
    const transcricao = await provider.transcreverAudio(midia.buffer, midia.mimeType, ia.config);
    const interpretado = await provider.interpretarMensagem(transcricao, ia.config);
    payload = normalizarMensagem(interpretado, undefined, ia.categorias) ?? semIntencaoDetectada(transcricao);
  } catch (err) {
    await criarRascunhoComErro(
      supabase,
      empresaId,
      key,
      participant,
      "whatsapp_audio",
      midia,
      mensagemErroIA(err),
    );
    return;
  }

  await criarRascunho(supabase, empresaId, key, participant, "whatsapp_audio", payload, midia);
}

async function processarFoto(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  ia: IAContext,
): Promise<void> {
  const midia = await baixarMidiaMensagem(key);
  if (!midia) {
    await criarRascunhoComErro(
      supabase,
      empresaId,
      key,
      participant,
      "whatsapp_foto",
      null,
      "não consegui baixar a foto",
    );
    return;
  }

  const provider = getAIProvider(ia.config?.provider);
  let payload: RascunhoPayload;
  try {
    const extraido = await provider.lerComprovante(midia.buffer, midia.mimeType, ia.config);
    payload = normalizarComprovante(extraido, ia.categorias);
  } catch (err) {
    await criarRascunhoComErro(
      supabase,
      empresaId,
      key,
      participant,
      "whatsapp_foto",
      midia,
      mensagemErroIA(err),
    );
    return;
  }

  await criarRascunho(supabase, empresaId, key, participant, "whatsapp_foto", payload, midia);
}

async function processarTexto(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  texto: string,
  ia: IAContext,
): Promise<void> {
  const textoLimpo = texto.trim();
  if (!textoLimpo) return;

  const match = textoLimpo.match(/^(\/\w+)\s*([\s\S]*)$/);
  if (match && COMANDOS[match[1].toLowerCase()]) {
    await processarComando(supabase, empresaId, key, participant, COMANDOS[match[1].toLowerCase()], match[2].trim(), ia);
    return;
  }

  // não é comando: só interessa se houver um rascunho pendente desse participant
  const rascunho = await buscarRascunhoPendente(supabase, empresaId, key.remoteJid, participant);
  if (!rascunho) return; // conversa comum do grupo -> ignora, sem chamar IA

  await processarRespostaRascunho(supabase, empresaId, key, participant, rascunho, textoLimpo, ia);
}

async function processarComando(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  tipoForcado: LancamentoTipo,
  resto: string,
  ia: IAContext,
): Promise<void> {
  const provider = getAIProvider(ia.config?.provider);
  let payload: RascunhoPayload | null;
  try {
    const interpretado = await provider.interpretarMensagem(resto, ia.config);
    payload = normalizarMensagem(interpretado, tipoForcado, ia.categorias);
  } catch (err) {
    await criarRascunhoComErro(
      supabase,
      empresaId,
      key,
      participant,
      "whatsapp_texto",
      null,
      mensagemErroIA(err),
    );
    return;
  }

  await criarRascunho(supabase, empresaId, key, participant, "whatsapp_texto", payload, null);
}

/** Busca o rascunho pendente mais recente do participant; expira lazily se passou de expira_em. */
async function buscarRascunhoPendente(
  supabase: SupabaseClient,
  empresaId: string,
  grupoJid: string,
  participant: string,
): Promise<RascunhoRow | null> {
  const { data } = await supabase
    .from("lancamentos_pendentes")
    .select("id, status, origem, payload, media_url, motorista_id, expira_em")
    .eq("empresa_id", empresaId)
    .eq("grupo_jid", grupoJid)
    .eq("participant", participant)
    .in("status", ["pendente", "erro"])
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  if (new Date(data.expira_em).getTime() < Date.now()) {
    await supabase.from("lancamentos_pendentes").update({ status: "expirado" }).eq("id", data.id);
    return null;
  }

  return data as RascunhoRow;
}

/** Trata a resposta do participant a um rascunho pendente: confirmar, cancelar ou corrigir. */
async function processarRespostaRascunho(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  rascunho: RascunhoRow,
  texto: string,
  ia: IAContext,
): Promise<void> {
  const numero = numeroDoJid(participant);

  if (REGEX_CANCELA.test(texto)) {
    await supabase.from("lancamentos_pendentes").update({ status: "expirado" }).eq("id", rascunho.id);
    await enviarMensagemTexto(key.remoteJid, `@${numero}, lançamento descartado.`, participant);
    return;
  }

  if (REGEX_CONFIRMA.test(texto)) {
    if (rascunho.status === "erro") {
      await enviarMensagemTexto(
        key.remoteJid,
        `@${numero}, ainda não tenho o valor desse lançamento. Me informe o valor (ex: "45.90") antes de confirmar.`,
        participant,
      );
      return;
    }

    const { totalLancamentos, totalViagens } = await salvarLancamento(supabase, empresaId, rascunho);
    const msgLancamentos =
      totalLancamentos === 1 ? "Lançamento salvo" : `${totalLancamentos} lançamentos salvos`;
    const msgViagens =
      totalViagens === 0 ? "" : totalViagens === 1 ? " e viagem registrada" : ` e ${totalViagens} viagens registradas`;
    await enviarMensagemTexto(key.remoteJid, `@${numero}, pronto! ${msgLancamentos}${msgViagens}. ✅`, participant);
    return;
  }

  // não foi confirmação nem cancelamento -> tenta interpretar como correção
  const provider = getAIProvider(ia.config?.provider);
  let correcao;
  try {
    correcao = await provider.interpretarMensagem(texto, ia.config);
  } catch (err) {
    mensagemErroIA(err);
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, não consegui processar com a IA. Responda *SIM* para confirmar como está, ou tente corrigir de novo.`,
      participant,
    );
    return;
  }

  if (correcaoVazia(correcao)) {
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, não entendi. Responda *SIM* para confirmar, *NÃO* para descartar, ou corrija o valor/categoria/data.`,
      participant,
    );
    return;
  }

  const payloadAtualizado = aplicarCorrecao(rascunho.payload, correcao, ia.categorias);
  const status = payloadCompleto(payloadAtualizado) ? "pendente" : "erro";
  const motoristaId =
    payloadAtualizado.motorista !== rascunho.payload.motorista
      ? await resolverMotoristaId(supabase, empresaId, participant, payloadAtualizado.motorista)
      : rascunho.motorista_id;

  await supabase
    .from("lancamentos_pendentes")
    .update({
      payload: payloadAtualizado,
      status,
      motorista_id: motoristaId,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", rascunho.id);

  await enviarMensagemTexto(key.remoteJid, mensagemRascunho(numero, payloadAtualizado, status), participant);
}

/** Grava todos os lançamentos confirmados, fecha o rascunho e retorna quantos itens/viagens foram salvos. */
async function salvarLancamento(
  supabase: SupabaseClient,
  empresaId: string,
  rascunho: RascunhoRow,
): Promise<{ totalLancamentos: number; totalViagens: number }> {
  const { payload } = rascunho;

  let totalViagens = 0;
  const rows = [];
  for (const item of payload.itens) {
    let viagemId: string | null = null;
    if (item.origem && item.destino) {
      viagemId = await criarViagemDoItem(supabase, empresaId, item, rascunho.motorista_id);
      if (viagemId) totalViagens += 1;
    }

    rows.push({
      empresa_id: empresaId,
      tipo: item.tipo,
      categoria: item.categoria,
      valor: item.valor,
      descricao: item.descricao,
      data: item.data,
      origem: rascunho.origem,
      anexo_url: rascunho.media_url,
      viagem_id: viagemId,
      motorista_id: rascunho.motorista_id,
    });
  }

  await supabase.from("lancamentos_financeiros").insert(rows);
  await supabase.from("lancamentos_pendentes").update({ status: "confirmado" }).eq("id", rascunho.id);

  return { totalLancamentos: rows.length, totalViagens };
}

/**
 * Cria uma viagem (status "concluída") a partir de um item com origem/destino
 * (ex: "socorro de Jaboticabal até Taiúçu"). Resolve os municípios via
 * `resolverLocalizacao` e calcula a rota quando possível. Retorna o id da
 * viagem criada, ou null se a inserção falhar.
 */
async function criarViagemDoItem(
  supabase: SupabaseClient,
  empresaId: string,
  item: ItemRascunho,
  motoristaId: string | null,
): Promise<string | null> {
  const [origemLoc, destinoLoc] = await Promise.all([
    resolverLocalizacao(item.origem!),
    resolverLocalizacao(item.destino!),
  ]);

  let distanciaKm: number | null = null;
  let pedagioEstimado: number | null = null;
  if (
    origemLoc?.ibge &&
    destinoLoc?.ibge &&
    origemLoc.lat !== null &&
    origemLoc.lon !== null &&
    destinoLoc.lat !== null &&
    destinoLoc.lon !== null
  ) {
    const rota = await getRota(
      { ibge: origemLoc.ibge, lat: origemLoc.lat, lon: origemLoc.lon },
      { ibge: destinoLoc.ibge, lat: destinoLoc.lat, lon: destinoLoc.lon },
    );
    if (rota) {
      distanciaKm = rota.distanciaKm;
      pedagioEstimado = rota.pedagioEstimado;
    }
  }

  const { data: viagem, error } = await supabase
    .from("viagens")
    .insert({
      empresa_id: empresaId,
      motorista_id: motoristaId,
      origem: item.origem,
      destino: item.destino,
      origem_cidade: origemLoc?.cidade ?? null,
      origem_uf: origemLoc?.uf ?? null,
      origem_ibge: origemLoc?.ibge ?? null,
      origem_lat: origemLoc?.lat ?? null,
      origem_lon: origemLoc?.lon ?? null,
      destino_cidade: destinoLoc?.cidade ?? null,
      destino_uf: destinoLoc?.uf ?? null,
      destino_ibge: destinoLoc?.ibge ?? null,
      destino_lat: destinoLoc?.lat ?? null,
      destino_lon: destinoLoc?.lon ?? null,
      distancia_km: distanciaKm,
      pedagio_estimado: pedagioEstimado,
      valor: item.tipo === "receita" ? (item.valor ?? 0) : 0,
      status: "concluida",
      data: item.data,
      observacoes: item.descricao,
      segurado: item.segurado ?? null,
      placa_cliente: item.placaCliente ?? null,
    })
    .select("id")
    .single();

  if (error || !viagem) {
    console.error("[whatsapp] falha ao criar viagem", error?.message);
    return null;
  }

  return viagem.id;
}

function semIntencaoDetectada(transcricao: string): RascunhoPayload | null {
  return {
    itens: [
      {
        tipo: "despesa",
        valor: null,
        categoria: "Outros",
        data: hojeISO(),
        descricao: transcricao || null,
      },
    ],
    motorista: null,
  };
}

function mensagemErroIA(err: unknown): string {
  if (err instanceof AIProviderError) {
    console.error("[whatsapp] erro da IA", err.message, err.cause ?? "");
  } else {
    console.error("[whatsapp] erro inesperado", err);
  }
  return "não consegui processar com a IA";
}

/**
 * Placas inválidas não bloqueiam a viagem (é criada normalmente), mas o
 * grupo é avisado pra corrigir depois — geralmente na edição manual.
 */
function avisoPlacaInvalida(itens: RascunhoPayload["itens"]): string {
  const invalidas = itens
    .map((item) => item.placaCliente)
    .filter((placa): placa is string => !!placa && !validarPlaca(placa).valida);
  if (invalidas.length === 0) return "";
  return `\n⚠️ Placa "${invalidas.join('", "')}" não parece válida (formatos aceitos: AAA0000 ou AAA0A00). A viagem foi aberta assim mesmo — corrija a placa depois na edição.`;
}

/** Mensagem de confirmação (status "pendente") ou pedido de valor (status "erro"). */
function mensagemRascunho(numero: string, payload: RascunhoPayload, status: "pendente" | "erro"): string {
  const itens = payload.itens;
  const aviso = avisoPlacaInvalida(itens);

  if (status === "erro") {
    if (itens.length === 1) {
      return `@${numero}, não consegui identificar o valor desse lançamento. Responda com o valor correto (ex: "45.90") pra eu completar.${aviso}`;
    }
    const lista = itens
      .map((item, i) => `${i + 1}) ${item.categoria}${item.valor !== null ? ` — ${formatCurrency(item.valor)}` : " — valor?"}`)
      .join("\n");
    return `@${numero}, identifiquei ${itens.length} lançamentos, mas falta o valor de algum deles:\n${lista}\nResponda com o(s) valor(es) correto(s) pra eu completar.${aviso}`;
  }

  if (itens.length === 1) {
    const item = itens[0];
    return `@${numero}, registrei ${formatCurrency(item.valor!)} de ${item.categoria} (${LANCAMENTO_TIPO_LABEL[item.tipo]}) em ${formatDate(item.data)}. Responda *SIM* para salvar ou corrija o valor/categoria.${aviso}`;
  }

  const lista = itens
    .map((item, i) => {
      const descricao = item.descricao ? ` (${item.descricao})` : "";
      return `${i + 1}) ${LANCAMENTO_TIPO_LABEL[item.tipo]} ${formatCurrency(item.valor!)} — ${item.categoria}${descricao}`;
    })
    .join("\n");
  return `@${numero}, registrei:\n${lista}\nConfirma os ${itens.length} lançamentos? Responda *SIM* para salvar ou corrija.${aviso}`;
}

/** Cria o rascunho pendente, faz upload da mídia (se houver) e responde no grupo. */
async function criarRascunho(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  origem: "whatsapp_audio" | "whatsapp_foto" | "whatsapp_texto",
  payload: RascunhoPayload | null,
  midia: { buffer: Buffer; mimeType: string } | null,
): Promise<void> {
  const payloadFinal: RascunhoPayload = payload ?? payloadVazio();
  const status = payloadCompleto(payloadFinal) ? "pendente" : "erro";

  const mediaUrl = midia ? await uploadMidia(supabase, empresaId, midia) : null;
  const motoristaId = await resolverMotoristaId(supabase, empresaId, participant, payloadFinal.motorista);

  await supabase.from("lancamentos_pendentes").insert({
    empresa_id: empresaId,
    grupo_jid: key.remoteJid,
    participant,
    origem,
    payload: payloadFinal,
    media_url: mediaUrl,
    message_id: key.id,
    status,
    motorista_id: motoristaId,
  });

  const numero = numeroDoJid(participant);
  await enviarMensagemTexto(key.remoteJid, mensagemRascunho(numero, payloadFinal, status), participant);
}

/** Cria um rascunho com status "erro" (extração falhou) e avisa o grupo. */
async function criarRascunhoComErro(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  origem: "whatsapp_audio" | "whatsapp_foto" | "whatsapp_texto",
  midia: { buffer: Buffer; mimeType: string } | null,
  motivo: string,
): Promise<void> {
  const mediaUrl = midia ? await uploadMidia(supabase, empresaId, midia) : null;
  const motoristaId = await resolverMotoristaId(supabase, empresaId, participant, null);

  await supabase.from("lancamentos_pendentes").insert({
    empresa_id: empresaId,
    grupo_jid: key.remoteJid,
    participant,
    origem,
    payload: payloadVazio(),
    media_url: mediaUrl,
    message_id: key.id,
    status: "erro",
    motorista_id: motoristaId,
  });

  const numero = numeroDoJid(participant);
  await enviarMensagemTexto(
    key.remoteJid,
    `@${numero}, ${motivo}. Pode me informar manualmente o valor, a categoria e a descrição?`,
    participant,
  );
}

/** Rascunho mínimo (1 item vazio) usado quando a extração não retorna nada aproveitável. */
function payloadVazio(): RascunhoPayload {
  return {
    itens: [
      {
        tipo: "despesa",
        valor: null,
        categoria: "Outros",
        data: hojeISO(),
        descricao: null,
      },
    ],
    motorista: null,
  };
}

const EXTENSOES: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function uploadMidia(
  supabase: SupabaseClient,
  empresaId: string,
  midia: { buffer: Buffer; mimeType: string },
): Promise<string | null> {
  const ext = EXTENSOES[midia.mimeType] ?? "bin";
  const path = `${empresaId}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("comprovantes")
    .upload(path, midia.buffer, { contentType: midia.mimeType });

  if (error) {
    console.error("[whatsapp] falha ao subir mídia pro storage", error.message);
    return null;
  }

  return path;
}
