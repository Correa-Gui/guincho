import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getAIProvider, AIProviderError } from "@/lib/ai";
import { LANCAMENTO_TIPO_LABEL, type LancamentoTipo } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { baixarMidiaMensagem, enviarMensagemTexto, numeroDoJid } from "./evolution";
import { aplicarCorrecao, correcaoVazia, normalizarComprovante, normalizarMensagem } from "./normalizar";
import type { EvolutionMessageKey, EvolutionWebhookBody, RascunhoPayload } from "./types";

const GRUPO_AUTORIZADO = process.env.WHATSAPP_GRUPO_JID;

const COMANDOS: Record<string, LancamentoTipo> = {
  "/gasto": "despesa",
  "/ganho": "receita",
};

const REGEX_CONFIRMA = /^(sim|s|confirma(do)?|confirmar|isso|correto|certo|ok)\b/i;
const REGEX_CANCELA = /^(n[aã]o|n|cancela(r)?|errado|apaga(r)?|descarta(r)?)\b/i;

type RascunhoRow = {
  id: string;
  status: string;
  origem: "whatsapp_audio" | "whatsapp_foto" | "whatsapp_texto";
  payload: RascunhoPayload;
  media_url: string | null;
};

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

  const participant = key.participant ?? key.remoteJid;
  const texto =
    message?.conversation ?? message?.extendedTextMessage?.text ?? message?.imageMessage?.caption ?? "";

  if (messageType === "audioMessage") {
    await processarAudio(supabase, grupo.empresa_id, key, participant);
  } else if (messageType === "imageMessage") {
    await processarFoto(supabase, grupo.empresa_id, key, participant);
  } else if (messageType === "conversation" || messageType === "extendedTextMessage") {
    await processarTexto(supabase, grupo.empresa_id, key, participant, texto);
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

  const provider = getAIProvider();
  let payload: RascunhoPayload | null;
  try {
    const transcricao = await provider.transcreverAudio(midia.buffer, midia.mimeType);
    const interpretado = await provider.interpretarMensagem(transcricao);
    payload = normalizarMensagem(interpretado) ?? semIntencaoDetectada(transcricao);
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

  const provider = getAIProvider();
  let payload: RascunhoPayload;
  try {
    const extraido = await provider.lerComprovante(midia.buffer, midia.mimeType);
    payload = normalizarComprovante(extraido);
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
): Promise<void> {
  const textoLimpo = texto.trim();
  if (!textoLimpo) return;

  const match = textoLimpo.match(/^(\/\w+)\s*([\s\S]*)$/);
  if (match && COMANDOS[match[1].toLowerCase()]) {
    await processarComando(supabase, empresaId, key, participant, COMANDOS[match[1].toLowerCase()], match[2].trim());
    return;
  }

  // não é comando: só interessa se houver um rascunho pendente desse participant
  const rascunho = await buscarRascunhoPendente(supabase, empresaId, key.remoteJid, participant);
  if (!rascunho) return; // conversa comum do grupo -> ignora, sem chamar IA

  await processarRespostaRascunho(supabase, empresaId, key, participant, rascunho, textoLimpo);
}

async function processarComando(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  tipoForcado: LancamentoTipo,
  resto: string,
): Promise<void> {
  const provider = getAIProvider();
  let payload: RascunhoPayload | null;
  try {
    const interpretado = await provider.interpretarMensagem(resto);
    payload = normalizarMensagem(interpretado, tipoForcado);
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
    .select("id, status, origem, payload, media_url, expira_em")
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

    await salvarLancamento(supabase, empresaId, rascunho);
    await enviarMensagemTexto(key.remoteJid, `@${numero}, pronto! Lançamento salvo. ✅`, participant);
    return;
  }

  // não foi confirmação nem cancelamento -> tenta interpretar como correção
  const provider = getAIProvider();
  let correcao;
  try {
    correcao = await provider.interpretarMensagem(texto);
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

  const payloadAtualizado = aplicarCorrecao(rascunho.payload, correcao);
  const status = payloadAtualizado.valor !== null && payloadAtualizado.valor > 0 ? "pendente" : "erro";

  await supabase
    .from("lancamentos_pendentes")
    .update({ payload: payloadAtualizado, status, atualizado_em: new Date().toISOString() })
    .eq("id", rascunho.id);

  await enviarMensagemTexto(key.remoteJid, mensagemRascunho(numero, payloadAtualizado, status), participant);
}

/** Grava o lançamento confirmado e fecha o rascunho. */
async function salvarLancamento(
  supabase: SupabaseClient,
  empresaId: string,
  rascunho: RascunhoRow,
): Promise<void> {
  const { payload } = rascunho;

  await supabase.from("lancamentos_financeiros").insert({
    empresa_id: empresaId,
    tipo: payload.tipo,
    categoria: payload.categoria,
    valor: payload.valor,
    descricao: payload.descricao,
    data: payload.data,
    origem: rascunho.origem,
    anexo_url: rascunho.media_url,
  });

  await supabase.from("lancamentos_pendentes").update({ status: "confirmado" }).eq("id", rascunho.id);
}

function semIntencaoDetectada(transcricao: string): RascunhoPayload | null {
  return {
    tipo: "despesa",
    valor: null,
    categoria: "Outros",
    data: new Date().toISOString().slice(0, 10),
    descricao: transcricao || null,
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

/** Mensagem de confirmação (status "pendente") ou pedido de valor (status "erro"). */
function mensagemRascunho(numero: string, payload: RascunhoPayload, status: "pendente" | "erro"): string {
  if (status === "erro") {
    return `@${numero}, não consegui identificar o valor desse lançamento. Responda com o valor correto (ex: "45.90") pra eu completar.`;
  }
  return `@${numero}, registrei ${formatCurrency(payload.valor!)} de ${payload.categoria} (${LANCAMENTO_TIPO_LABEL[payload.tipo]}) em ${formatDate(payload.data)}. Responda *SIM* para salvar ou corrija o valor/categoria.`;
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
  const valorValido = payload !== null && payload.valor !== null && payload.valor > 0;
  const status = valorValido ? "pendente" : "erro";

  const payloadFinal: RascunhoPayload =
    payload ?? {
      tipo: "despesa",
      valor: null,
      categoria: "Outros",
      data: new Date().toISOString().slice(0, 10),
      descricao: null,
    };

  const mediaUrl = midia ? await uploadMidia(supabase, empresaId, midia) : null;

  await supabase.from("lancamentos_pendentes").insert({
    empresa_id: empresaId,
    grupo_jid: key.remoteJid,
    participant,
    origem,
    payload: payloadFinal,
    media_url: mediaUrl,
    message_id: key.id,
    status,
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

  await supabase.from("lancamentos_pendentes").insert({
    empresa_id: empresaId,
    grupo_jid: key.remoteJid,
    participant,
    origem,
    payload: {
      tipo: "despesa",
      valor: null,
      categoria: "Outros",
      data: new Date().toISOString().slice(0, 10),
      descricao: null,
    },
    media_url: mediaUrl,
    message_id: key.id,
    status: "erro",
  });

  const numero = numeroDoJid(participant);
  await enviarMensagemTexto(
    key.remoteJid,
    `@${numero}, ${motivo}. Pode me informar manualmente o valor, a categoria e a descrição?`,
    participant,
  );
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
