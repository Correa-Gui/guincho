import type { EvolutionMessageKey } from "./types";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

function config() {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    throw new Error(
      "Evolution API não configurada (EVOLUTION_API_URL/EVOLUTION_API_KEY/EVOLUTION_INSTANCE).",
    );
  }
  return {
    baseUrl: EVOLUTION_API_URL.replace(/\/+$/, ""),
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
    instance: EVOLUTION_INSTANCE,
  };
}

/** Envia uma mensagem de texto pro grupo, opcionalmente mencionando um participant. */
export async function enviarMensagemTexto(
  remoteJid: string,
  texto: string,
  mentionJid?: string,
): Promise<void> {
  const { baseUrl, headers, instance } = config();

  const body: Record<string, unknown> = { number: remoteJid, text: texto };
  if (mentionJid) body.mentioned = [mentionJid];

  const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const erro = await res.text().catch(() => "");
    console.error("[evolution] sendText falhou", res.status, erro.slice(0, 300));
  }
}

export type MidiaBaixada = { buffer: Buffer; mimeType: string };

/** Baixa a mídia (áudio/imagem) de uma mensagem via Evolution API, em base64. */
export async function baixarMidiaMensagem(
  messageKey: EvolutionMessageKey,
): Promise<MidiaBaixada | null> {
  const { baseUrl, headers, instance } = config();

  const res = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${instance}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: { key: messageKey }, convertToMp4: false }),
  });

  if (!res.ok) {
    const erro = await res.text().catch(() => "");
    console.error("[evolution] getBase64FromMediaMessage falhou", res.status, erro.slice(0, 300));
    return null;
  }

  const data = await res.json().catch(() => null);
  if (typeof data?.base64 !== "string") return null;

  const mimeType = String(data.mimetype ?? "application/octet-stream").split(";")[0].trim();
  return { buffer: Buffer.from(data.base64, "base64"), mimeType };
}

/** Extrai o número de telefone do JID (ex: "5516999999999@s.whatsapp.net" -> "5516999999999"). */
export function numeroDoJid(jid: string): string {
  return jid.split("@")[0].split(":")[0];
}
