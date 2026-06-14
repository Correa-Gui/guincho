import { NextResponse } from "next/server";
import { processarWebhookEvolution } from "@/lib/whatsapp/processar";
import type { EvolutionWebhookBody } from "@/lib/whatsapp/types";

/**
 * Webhook da Evolution API. A autenticidade é validada pelo segredo no
 * próprio path (configurado como URL do webhook na Evolution API), já que
 * a Evolution não assina o payload por padrão.
 */
export async function POST(request: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;

  const esperado = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!esperado || secret !== esperado) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as EvolutionWebhookBody | null;
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    await processarWebhookEvolution(body);
  } catch (err) {
    console.error("[webhook/evolution] falha ao processar mensagem", err);
  }

  // sempre 200: evita retries da Evolution API para erros já tratados/logados
  return NextResponse.json({ ok: true });
}
