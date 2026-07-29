import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getAIProvider, AIProviderError, buscarConfiguracaoIA, categoriasDaConfiguracao, type ConfiguracaoIA } from "@/lib/ai";
import { LANCAMENTO_TIPO_LABEL, type ItemRascunho, type LancamentoTipo } from "@/lib/types";
import { formatCurrency, formatDate, formatKm, validarPlaca } from "@/lib/format";
import { resolverLocalizacao } from "@/lib/enderecos";
import { resolverClienteId } from "@/lib/clientes";
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
const REGEX_CANCELA = /^(n[aã]o|n|cancela(r)?|errado|apaga(r)?|descarta(r)?|pular|depois|agora n[aã]o)\b/i;
// Aceita com ou sem "/" na frente ("/resumo" ou "resumo diário") e um nome de
// motorista opcional no final ("resumo motorista Bruno").
const REGEX_RESUMO = /^\/?resumo(?:\s+di[aá]rio)?(?:\s+d[oa]\s+dia)?(?:\s+motorista\s+(.+))?\s*$/i;
// Aceita com ou sem "/" na frente e um destino opcional ("nova viagem para Jaboticabal" / "nova viagem pra Jaboticabal").
const REGEX_NOVA_VIAGEM = /^\/?nova\s+viagem(?:\s+(?:para|pra)\s+(.+))?\s*$/i;
// Aceita com ou sem "/" na frente (texto digitado OU falado por áudio, que nunca transcreve a barra).
const REGEX_ENCERRAR = /^\/?encerrar\b\s*([\s\S]*)$/i;

/** Extrai só os dígitos do texto e converte pra km (inteiro). Ex: "45.890 km" -> 45890. */
function parseKmInteiro(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "");
  if (!digitos) return null;
  const valor = Number(digitos);
  return Number.isFinite(valor) ? valor : null;
}

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

type PerguntaKmRow = {
  id: string;
  viagem_id: string;
};

/**
 * Resolve o motorista do lançamento: prioriza o nome citado explicitamente na
 * mensagem (ex: "motorista: Fulano"), com fallback pro telefone de quem
 * enviou a mensagem no grupo (casado contra `motoristas.telefone_normalizado`)
 * e, por último, pro `pushName` (nome de exibição do WhatsApp de quem
 * enviou). O fallback por telefone só funciona quando o JID do participant é
 * baseado em número (`@s.whatsapp.net`) — grupos com "Linked ID" ativado
 * mandam `participant` como `@lid` (id opaco, sem telefone nenhum), caso em
 * que o pushName é o único jeito de identificar quem mandou.
 */
async function resolverMotoristaId(
  supabase: SupabaseClient,
  empresaId: string,
  participant: string,
  motoristaNome: string | null,
  pushName: string | null,
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
    .in("telefone_normalizado", telefonesCandidatos(numero))
    .maybeSingle();
  if (porTelefone) return porTelefone.id;

  if (pushName) {
    const { data: porPushName } = await supabase
      .from("motoristas")
      .select("id")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .ilike("nome", `%${pushName}%`)
      .limit(1)
      .maybeSingle();
    if (porPushName) return porPushName.id;
  }

  return null;
}

/**
 * O JID do WhatsApp sempre traz o DDI 55 (ex: "5516996465735"), mas
 * `telefone_normalizado` é gerado a partir do que foi digitado manualmente no
 * cadastro do motorista, que normalmente NÃO inclui o DDI (ex: "16996465735").
 * Testa os dois formatos pra não depender de como o número foi cadastrado.
 */
function telefonesCandidatos(numero: string): string[] {
  const candidatos = [numero];
  if (numero.startsWith("55") && (numero.length === 12 || numero.length === 13)) {
    candidatos.push(numero.slice(2));
  }
  return candidatos;
}

/** Ponto de entrada: processa um evento de webhook da Evolution API. */
export async function processarWebhookEvolution(body: EvolutionWebhookBody): Promise<void> {
  if (body.event !== "messages.upsert" || !body.data?.key) return;

  const { key, message, messageType, pushName } = body.data;

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
    await processarAudio(supabase, grupo.empresa_id, key, participant, ia, pushName ?? null);
  } else if (messageType === "imageMessage") {
    await processarFoto(supabase, grupo.empresa_id, key, participant, ia, pushName ?? null);
  } else if (messageType === "conversation" || messageType === "extendedTextMessage") {
    await processarTexto(supabase, grupo.empresa_id, key, participant, texto, ia, pushName ?? null);
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
  pushName: string | null,
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
      pushName,
    );
    return;
  }

  const provider = getAIProvider(ia.config?.provider);
  let transcricao: string;
  try {
    transcricao = await provider.transcreverAudio(midia.buffer, midia.mimeType, ia.config);
  } catch (err) {
    await criarRascunhoComErro(
      supabase,
      empresaId,
      key,
      participant,
      "whatsapp_audio",
      midia,
      mensagemErroIA(err),
      pushName,
    );
    return;
  }

  const textoLimpo = transcricao.trim();
  if (textoLimpo) {
    // áudio "nova viagem para X", "encerrar 45890", "resumo", confirmação/correção de rascunho
    // pendente ou resposta de KM inicial: trata igual a texto digitado, antes de cair pra IA livre.
    const tratado = await processarComandoOuSessao(supabase, empresaId, key, participant, textoLimpo, ia, pushName);
    if (tratado) return;
  }

  let payload: RascunhoPayload | null;
  try {
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
      pushName,
    );
    return;
  }

  await criarRascunho(supabase, empresaId, key, participant, "whatsapp_audio", payload, midia, pushName);
}

async function processarFoto(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  ia: IAContext,
  pushName: string | null,
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
      pushName,
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
      pushName,
    );
    return;
  }

  await criarRascunho(supabase, empresaId, key, participant, "whatsapp_foto", payload, midia, pushName);
}

async function processarTexto(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  texto: string,
  ia: IAContext,
  pushName: string | null,
): Promise<void> {
  const textoLimpo = texto.trim();
  if (!textoLimpo) return;

  // texto solto sem comando/sessão pendente -> ignora, sem chamar IA (evita reagir a papo comum do grupo).
  await processarComandoOuSessao(supabase, empresaId, key, participant, textoLimpo, ia, pushName);
}

/**
 * Dispatcher compartilhado por texto digitado e por transcrição de áudio:
 * tenta, em ordem, comando /gasto ou /ganho, /encerrar (com ou sem barra),
 * "resumo", "nova viagem", resposta a rascunho pendente e resposta a pergunta
 * de KM inicial pendente. Retorna true se algum desses tratou a mensagem
 * (chamador não precisa fazer mais nada); false se nada bateu — quem chamou
 * decide o que fazer com o texto (processarTexto ignora; processarAudio cai
 * para a interpretação livre da IA, já que gravar um áudio é sempre
 * intencional, diferente de uma mensagem de texto solta no grupo).
 */
async function processarComandoOuSessao(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  textoLimpo: string,
  ia: IAContext,
  pushName: string | null,
): Promise<boolean> {
  const encerrarMatch = textoLimpo.match(REGEX_ENCERRAR);
  if (encerrarMatch) {
    await processarEncerramento(supabase, empresaId, key, participant, encerrarMatch[1].trim(), pushName);
    return true;
  }

  const match = textoLimpo.match(/^(\/\w+)\s*([\s\S]*)$/);
  if (match) {
    const comando = match[1].toLowerCase();
    if (COMANDOS[comando]) {
      await processarComando(supabase, empresaId, key, participant, COMANDOS[comando], match[2].trim(), ia, pushName);
      return true;
    }
  }

  const resumoMatch = textoLimpo.match(REGEX_RESUMO);
  if (resumoMatch) {
    await processarResumoDiario(supabase, empresaId, key, participant, resumoMatch[1]?.trim() || null);
    return true;
  }

  const novaViagemMatch = textoLimpo.match(REGEX_NOVA_VIAGEM);
  if (novaViagemMatch) {
    await processarNovaViagem(supabase, empresaId, key, participant, novaViagemMatch[1]?.trim() || null, pushName);
    return true;
  }

  const rascunho = await buscarRascunhoPendente(supabase, empresaId, key.remoteJid, participant);
  if (rascunho) {
    await processarRespostaRascunho(supabase, empresaId, key, participant, rascunho, textoLimpo, ia, pushName);
    return true;
  }

  const perguntaKm = await buscarPerguntaKmPendente(supabase, empresaId, key.remoteJid, participant);
  if (perguntaKm) {
    await processarRespostaKmInicial(supabase, key, participant, perguntaKm, textoLimpo);
    return true;
  }

  return false;
}

async function processarComando(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  tipoForcado: LancamentoTipo,
  resto: string,
  ia: IAContext,
  pushName: string | null,
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
      pushName,
    );
    return;
  }

  await criarRascunho(supabase, empresaId, key, participant, "whatsapp_texto", payload, null, pushName);
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

/** Busca a pergunta de "km inicial?" pendente mais recente do participant; expira lazily. */
async function buscarPerguntaKmPendente(
  supabase: SupabaseClient,
  empresaId: string,
  grupoJid: string,
  participant: string,
): Promise<PerguntaKmRow | null> {
  const { data } = await supabase
    .from("viagem_km_perguntas")
    .select("id, viagem_id, expira_em")
    .eq("empresa_id", empresaId)
    .eq("grupo_jid", grupoJid)
    .eq("participant", participant)
    .eq("status", "pendente")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  if (new Date(data.expira_em).getTime() < Date.now()) {
    await supabase.from("viagem_km_perguntas").update({ status: "expirada" }).eq("id", data.id);
    return null;
  }

  return { id: data.id, viagem_id: data.viagem_id };
}

/**
 * Trata a resposta à pergunta "deseja informar o KM inicial dessa viagem?".
 * Recusa (não/pular/...) só fecha a pergunta. Km reconhecido grava km_inicial
 * e marca a viagem "em_andamento" (fica aguardando /encerrar). Texto que não
 * é nem recusa nem número é ignorado (conversa comum do grupo).
 */
async function processarRespostaKmInicial(
  supabase: SupabaseClient,
  key: EvolutionMessageKey,
  participant: string,
  pergunta: PerguntaKmRow,
  texto: string,
): Promise<void> {
  const numero = numeroDoJid(participant);

  if (REGEX_CANCELA.test(texto)) {
    await supabase.from("viagem_km_perguntas").update({ status: "respondida" }).eq("id", pergunta.id);
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, sem problema. Quando quiser encerrar essa viagem, use /encerrar <km final>.`,
      participant,
    );
    return;
  }

  const km = parseKmInteiro(texto);
  if (km === null) return;

  await supabase.from("viagem_km_perguntas").update({ status: "respondida" }).eq("id", pergunta.id);
  const { error } = await supabase
    .from("viagens")
    .update({ km_inicial: km, status: "em_andamento" })
    .eq("id", pergunta.viagem_id);

  if (error) {
    console.error("[whatsapp] falha ao gravar km inicial", error.message);
    await enviarMensagemTexto(key.remoteJid, `@${numero}, não consegui registrar o km, tenta de novo.`, participant);
    return;
  }

  await enviarMensagemTexto(
    key.remoteJid,
    `@${numero}, KM inicial registrado: ${formatKm(km)}. Quando finalizar, envie /encerrar <km final> pra fechar a viagem.`,
    participant,
  );
}

/**
 * Trata o comando /encerrar <km final> (ou /encerrar <placa> <km final> se o
 * motorista tiver mais de uma viagem em andamento). Fecha a viagem
 * "em_andamento" mais recente do motorista, grava km_final e valida que não
 * seja menor que o km_inicial.
 */
async function processarEncerramento(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  resto: string,
  pushName: string | null,
): Promise<void> {
  const numero = numeroDoJid(participant);
  const tokens = resto.split(/\s+/).filter(Boolean);

  if (tokens.length === 0 || tokens.length > 2) {
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, formato esperado: /encerrar <km final> (ex: /encerrar 45890). Se tiver mais de uma viagem aberta: /encerrar <placa> <km final>.`,
      participant,
    );
    return;
  }

  const kmToken = tokens.length === 2 ? tokens[1] : tokens[0];
  const placaToken = tokens.length === 2 ? tokens[0] : null;

  const kmFinal = parseKmInteiro(kmToken);
  if (kmFinal === null) {
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, não entendi o km final. Envie só o número, ex: /encerrar 45890.`,
      participant,
    );
    return;
  }

  const motoristaId = await resolverMotoristaId(supabase, empresaId, participant, null, pushName);
  if (!motoristaId) {
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, não encontrei seu cadastro de motorista pra encerrar a viagem.`,
      participant,
    );
    return;
  }

  let query = supabase
    .from("viagens")
    .select("id, origem, destino, km_inicial, placa_cliente")
    .eq("empresa_id", empresaId)
    .eq("motorista_id", motoristaId)
    .eq("status", "em_andamento")
    .order("created_at", { ascending: false });

  let placaNormalizada: string | null = null;
  if (placaToken) {
    placaNormalizada = validarPlaca(placaToken).normalizada;
    query = query.eq("placa_cliente", placaNormalizada);
  }

  const { data: viagensAbertas } = await query;

  if (!viagensAbertas || viagensAbertas.length === 0) {
    await enviarMensagemTexto(
      key.remoteJid,
      placaNormalizada
        ? `@${numero}, não encontrei viagem em andamento com a placa ${placaNormalizada} pra encerrar.`
        : `@${numero}, você não tem nenhuma viagem em andamento pra encerrar.`,
      participant,
    );
    return;
  }

  if (viagensAbertas.length > 1) {
    const lista = viagensAbertas
      .map((v) => `${v.placa_cliente ?? "sem placa"} — ${v.origem ?? "?"} até ${v.destino ?? "?"}`)
      .join("\n");
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, você tem ${viagensAbertas.length} viagens em andamento. Informe a placa: /encerrar <placa> <km final>.\n${lista}`,
      participant,
    );
    return;
  }

  const viagem = viagensAbertas[0];

  if (viagem.km_inicial === null) {
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, essa viagem não tem km inicial registrado, não dá pra calcular o km rodado.`,
      participant,
    );
    return;
  }

  if (kmFinal < viagem.km_inicial) {
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, km final (${formatKm(kmFinal)}) não pode ser menor que o km inicial (${formatKm(viagem.km_inicial)}). Confira o valor e tenta de novo.`,
      participant,
    );
    return;
  }

  const { error } = await supabase
    .from("viagens")
    .update({ km_final: kmFinal, status: "concluida" })
    .eq("id", viagem.id);

  if (error) {
    console.error("[whatsapp] falha ao encerrar viagem", error.message);
    await enviarMensagemTexto(key.remoteJid, `@${numero}, não consegui encerrar a viagem, tenta de novo.`, participant);
    return;
  }

  const kmRodado = kmFinal - viagem.km_inicial;
  const trajeto = viagem.origem && viagem.destino ? ` (${viagem.origem} até ${viagem.destino})` : "";
  await enviarMensagemTexto(
    key.remoteJid,
    `@${numero}, viagem encerrada${trajeto}! KM rodado: ${formatKm(kmRodado)}. ✅`,
    participant,
  );
}

/**
 * Trata o comando "nova viagem" (opcionalmente "nova viagem para <destino>").
 * Abre uma viagem "em_andamento" pro motorista (bloqueia se ele já tiver uma
 * aberta) e dispara a mesma pergunta de KM inicial usada no fluxo pós-
 * confirmação. Despesas soltas mandadas depois (sem origem/destino) são
 * vinculadas a essa viagem em `salvarLancamento`.
 */
async function processarNovaViagem(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  destino: string | null,
  pushName: string | null,
): Promise<void> {
  const numero = numeroDoJid(participant);

  const motoristaId = await resolverMotoristaId(supabase, empresaId, participant, null, pushName);
  if (!motoristaId) {
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, não encontrei seu cadastro de motorista pra abrir a viagem.`,
      participant,
    );
    return;
  }

  const viagemAbertaId = await buscarViagemEmAndamento(supabase, empresaId, motoristaId);
  if (viagemAbertaId) {
    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, você já tem uma viagem em andamento. Encerre com /encerrar <km final> antes de abrir outra.`,
      participant,
    );
    return;
  }

  const destinoLoc = destino ? await resolverLocalizacao(destino) : null;

  const { data: viagem, error } = await supabase
    .from("viagens")
    .insert({
      empresa_id: empresaId,
      motorista_id: motoristaId,
      destino,
      destino_cidade: destinoLoc?.cidade ?? null,
      destino_uf: destinoLoc?.uf ?? null,
      destino_ibge: destinoLoc?.ibge ?? null,
      destino_lat: destinoLoc?.lat ?? null,
      destino_lon: destinoLoc?.lon ?? null,
      valor: 0,
      status: "em_andamento",
      data: hojeISO(),
    })
    .select("id")
    .single();

  if (error || !viagem) {
    console.error("[whatsapp] falha ao abrir viagem", error?.message);
    await enviarMensagemTexto(key.remoteJid, `@${numero}, não consegui abrir a viagem, tenta de novo.`, participant);
    return;
  }

  await supabase.from("viagem_km_perguntas").insert({
    empresa_id: empresaId,
    viagem_id: viagem.id,
    grupo_jid: key.remoteJid,
    participant,
  });

  const trajeto = destino ? ` para ${destino}` : "";
  await enviarMensagemTexto(
    key.remoteJid,
    `@${numero}, viagem aberta${trajeto}! 🚛 Qual o KM inicial? Responda com o número (ex: 45890).\nDurante a viagem, pode mandar as despesas normalmente (almoço, pedágio, combustível...) que eu vinculo a essa viagem. Quando terminar, envie /encerrar <km final>.`,
    participant,
  );
}

/** Busca a viagem "em_andamento" mais recente do motorista, se houver (null se não tiver nenhuma). */
async function buscarViagemEmAndamento(
  supabase: SupabaseClient,
  empresaId: string,
  motoristaId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("viagens")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("motorista_id", motoristaId)
    .eq("status", "em_andamento")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

type LancamentoResumo = {
  tipo: LancamentoTipo;
  valor: number;
  motorista_id: string | null;
  motoristas: { nome: string } | null;
};

type ViagemKmResumo = {
  km_rodado: number | null;
  motorista_id: string | null;
  motoristas: { nome: string } | null;
};

/**
 * "resumo" / "resumo diário" / "/resumo" -> totais de hoje da empresa toda,
 * com quebra por motorista. "resumo motorista <nome>" -> só os lançamentos
 * desse motorista (ilike, mesmo critério usado em resolverMotoristaId).
 */
async function processarResumoDiario(
  supabase: SupabaseClient,
  empresaId: string,
  key: EvolutionMessageKey,
  participant: string,
  motoristaFiltro: string | null,
): Promise<void> {
  const numero = numeroDoJid(participant);
  const hoje = hojeISO();

  let motoristaNome: string | null = null;
  let motoristaId: string | null = null;
  if (motoristaFiltro) {
    const { data } = await supabase
      .from("motoristas")
      .select("id, nome")
      .eq("empresa_id", empresaId)
      .ilike("nome", `%${motoristaFiltro}%`)
      .limit(1)
      .maybeSingle();
    if (!data) {
      await enviarMensagemTexto(
        key.remoteJid,
        `@${numero}, não achei motorista "${motoristaFiltro}" cadastrado.`,
        participant,
      );
      return;
    }
    motoristaId = data.id;
    motoristaNome = data.nome;
  }

  const query = supabase
    .from("lancamentos_financeiros")
    .select("tipo, valor, motorista_id, motoristas(nome)")
    .eq("empresa_id", empresaId)
    .eq("data", hoje);
  if (motoristaId) query.eq("motorista_id", motoristaId);

  const kmQuery = supabase
    .from("viagens")
    .select("km_rodado, motorista_id, motoristas(nome)")
    .eq("empresa_id", empresaId)
    .eq("data", hoje)
    .not("km_rodado", "is", null);
  if (motoristaId) kmQuery.eq("motorista_id", motoristaId);

  const [{ data: lancamentos }, { data: viagensKm }] = await Promise.all([
    query.returns<LancamentoResumo[]>(),
    kmQuery.returns<ViagemKmResumo[]>(),
  ]);
  const itens = lancamentos ?? [];
  const viagens = viagensKm ?? [];

  if (itens.length === 0 && viagens.length === 0) {
    const quem = motoristaNome ? ` de ${motoristaNome}` : "";
    await enviarMensagemTexto(key.remoteJid, `@${numero}, nenhum lançamento${quem} hoje ainda. 📭`, participant);
    return;
  }

  const ganhos = itens.filter((i) => i.tipo === "receita").reduce((soma, i) => soma + i.valor, 0);
  const gastos = itens.filter((i) => i.tipo === "despesa").reduce((soma, i) => soma + i.valor, 0);
  const saldo = ganhos - gastos;
  const kmTotal = viagens.reduce((soma, v) => soma + (v.km_rodado ?? 0), 0);

  const titulo = motoristaNome
    ? `📅 Resumo de ${formatDate(hoje)} — ${motoristaNome}`
    : `📅 Resumo de ${formatDate(hoje)}`;

  const linhas = [
    titulo,
    `💰 Ganhos: ${formatCurrency(ganhos)}`,
    `💸 Gastos: ${formatCurrency(gastos)}`,
    `${saldo >= 0 ? "📈" : "📉"} Saldo: ${formatCurrency(saldo)}`,
    `🛣️ Km rodado: ${formatKm(kmTotal)}`,
  ];

  if (!motoristaNome) {
    const porMotorista = new Map<string, number>();
    for (const item of itens) {
      const nome = item.motoristas?.nome ?? "Sem motorista";
      const sinal = item.tipo === "receita" ? item.valor : -item.valor;
      porMotorista.set(nome, (porMotorista.get(nome) ?? 0) + sinal);
    }
    if (porMotorista.size > 0) {
      linhas.push("", "Por motorista:");
      for (const [nome, total] of porMotorista) {
        linhas.push(`🚛 ${nome} — ${formatCurrency(total)}`);
      }
    }

    const kmPorMotorista = new Map<string, number>();
    for (const viagem of viagens) {
      const nome = viagem.motoristas?.nome ?? "Sem motorista";
      kmPorMotorista.set(nome, (kmPorMotorista.get(nome) ?? 0) + (viagem.km_rodado ?? 0));
    }
    if (kmPorMotorista.size > 0) {
      linhas.push("", "Km por motorista:");
      for (const [nome, km] of kmPorMotorista) {
        linhas.push(`🛣️ ${nome} — ${formatKm(km)}`);
      }
    }
  }

  await enviarMensagemTexto(key.remoteJid, linhas.join("\n"), participant);
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
  pushName: string | null,
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

    const { totalLancamentos, viagensCriadas } = await salvarLancamento(supabase, empresaId, rascunho);
    const msgLancamentos =
      totalLancamentos === 1 ? "Lançamento salvo" : `${totalLancamentos} lançamentos salvos`;
    const msgViagens =
      viagensCriadas.length === 0
        ? ""
        : viagensCriadas.length === 1
          ? " e viagem registrada"
          : ` e ${viagensCriadas.length} viagens registradas`;

    // só oferece o fluxo de km quando dá pra depois localizar a viagem pelo /encerrar (precisa de motorista_id)
    let perguntaKm = "";
    if (viagensCriadas.length === 1 && rascunho.motorista_id) {
      await supabase.from("viagem_km_perguntas").insert({
        empresa_id: empresaId,
        viagem_id: viagensCriadas[0].id,
        grupo_jid: key.remoteJid,
        participant,
      });
      perguntaKm = "\nDeseja informar o KM inicial dessa viagem? Responda com o número (ex: 45890).";
    }

    await enviarMensagemTexto(
      key.remoteJid,
      `@${numero}, pronto! ${msgLancamentos}${msgViagens}. ✅${perguntaKm}`,
      participant,
    );
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
      ? await resolverMotoristaId(supabase, empresaId, participant, payloadAtualizado.motorista, pushName)
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
): Promise<{ totalLancamentos: number; viagensCriadas: { id: string; origem: string | null; destino: string | null }[] }> {
  const { payload } = rascunho;

  const viagemAberta = rascunho.motorista_id
    ? await buscarViagemEmAndamento(supabase, empresaId, rascunho.motorista_id)
    : null;

  const viagensCriadas: { id: string; origem: string | null; destino: string | null }[] = [];
  const rows = [];
  for (const item of payload.itens) {
    let viagemId: string | null = null;
    if (item.origem && item.destino) {
      viagemId = await criarViagemDoItem(supabase, empresaId, item, rascunho.motorista_id);
      if (viagemId) viagensCriadas.push({ id: viagemId, origem: item.origem, destino: item.destino });
    } else if (viagemAberta) {
      // sem origem/destino próprio: se o motorista tem viagem em_andamento, vincula a despesa/ganho a ela.
      viagemId = viagemAberta;
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

  return { totalLancamentos: rows.length, viagensCriadas };
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

  const clienteId = await resolverClienteId(supabase, empresaId, item.segurado);

  const { data: viagem, error } = await supabase
    .from("viagens")
    .insert({
      empresa_id: empresaId,
      motorista_id: motoristaId,
      cliente_id: clienteId,
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
      seguradora: item.seguradora ?? null,
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
  pushName: string | null,
): Promise<void> {
  const payloadFinal: RascunhoPayload = payload ?? payloadVazio();
  const status = payloadCompleto(payloadFinal) ? "pendente" : "erro";

  const mediaUrl = midia ? await uploadMidia(supabase, empresaId, midia) : null;
  const motoristaId = await resolverMotoristaId(supabase, empresaId, participant, payloadFinal.motorista, pushName);

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
  pushName: string | null,
): Promise<void> {
  const mediaUrl = midia ? await uploadMidia(supabase, empresaId, midia) : null;
  const motoristaId = await resolverMotoristaId(supabase, empresaId, participant, null, pushName);

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
