import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enviarRelatoriosDiariosTodasEmpresas } from "@/lib/whatsapp/relatorio-diario";

/**
 * Disparo do relatório diário (WhatsApp). Protegido por segredo no path,
 * pensado para ser chamado por um agendador externo (cron) uma vez por dia.
 */
async function handler(request: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;

  const esperado = process.env.RELATORIO_DIARIO_SECRET;
  if (!esperado || secret !== esperado) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    const resultado = await enviarRelatoriosDiariosTodasEmpresas(supabase);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    console.error("[cron/relatorio-diario] falha ao enviar relatórios", err);
    return NextResponse.json({ error: "falha ao enviar relatórios" }, { status: 500 });
  }
}

export { handler as GET, handler as POST };
