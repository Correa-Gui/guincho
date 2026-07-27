import type { ItemRascunho } from "@/lib/types";

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

/**
 * Payload normalizado de um rascunho ainda não confirmado. Uma mensagem
 * pode gerar vários lançamentos (ex: receita do frete + despesa do almoço).
 */
export type RascunhoPayload = {
  itens: ItemRascunho[];
  /** Nome do motorista mencionado explicitamente na mensagem (override do motorista identificado pelo telefone de quem enviou). */
  motorista: string | null;
};
