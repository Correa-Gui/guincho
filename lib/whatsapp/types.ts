import type { LancamentoTipo } from "@/lib/types";

export type EvolutionMessageKey = {
  remoteJid: string;
  fromMe: boolean;
  id: string;
  participant?: string;
};

export type EvolutionWebhookBody = {
  event?: string;
  instance?: string;
  data?: {
    key: EvolutionMessageKey;
    pushName?: string;
    messageType?: string;
    messageTimestamp?: number;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      audioMessage?: { mimetype?: string };
      imageMessage?: { mimetype?: string; caption?: string };
    };
  };
};

/** Payload normalizado de um lançamento ainda não confirmado. */
export type RascunhoPayload = {
  tipo: LancamentoTipo;
  valor: number | null;
  categoria: string;
  data: string; // YYYY-MM-DD
  descricao: string | null;
  estabelecimento?: string | null;
};
