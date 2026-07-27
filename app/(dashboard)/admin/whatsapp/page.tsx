import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteButton } from "@/components/shared/delete-button";
import { GrupoForm } from "@/components/whatsapp/grupo-form";
import { ToggleGrupoButton } from "@/components/whatsapp/toggle-grupo-button";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  LANCAMENTO_ORIGEM_LABEL,
  RASCUNHO_STATUS_BADGE_CLASS,
  RASCUNHO_STATUS_LABEL,
  type GrupoWhatsapp,
  type LancamentoPendente,
} from "@/lib/types";
import { deleteGrupo } from "./actions";

function StatusItem({ label, configurado }: { label: string; configurado: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <Badge className={configurado ? "bg-pos/10 text-pos" : "bg-warn/10 text-warn"}>
        {configurado ? "Configurado" : "Pendente"}
      </Badge>
    </div>
  );
}

export default async function WhatsappPage() {
  const supabase = await createClient();

  const { data: grupos } = await supabase
    .from("grupos_whatsapp")
    .select("id, grupo_jid, nome, ativo, created_at")
    .order("created_at")
    .returns<GrupoWhatsapp[]>();

  const { data: historico } = await supabase
    .from("lancamentos_pendentes")
    .select("id, grupo_jid, participant, origem, payload, status, criado_em")
    .order("criado_em", { ascending: false })
    .limit(30)
    .returns<LancamentoPendente[]>();

  const evolutionConfigurada = Boolean(
    process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE,
  );
  const webhookConfigurado = Boolean(process.env.EVOLUTION_WEBHOOK_SECRET);
  const iaConfigurada = Boolean(process.env.GEMINI_API_KEY);
  const grupoConfigurado = (grupos ?? []).some((g) => g.ativo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          WhatsApp
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lance receitas e despesas mandando áudio, foto de comprovante ou um comando no grupo do
          WhatsApp.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status da integração</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <StatusItem label="Evolution API (envio/recebimento)" configurado={evolutionConfigurada} />
          <StatusItem label="Webhook configurado" configurado={webhookConfigurado} />
          <StatusItem label="IA (Gemini)" configurado={iaConfigurada} />
          <StatusItem label="Grupo autorizado vinculado" configurado={grupoConfigurado} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grupos vinculados</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GrupoForm />

          {(grupos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum grupo vinculado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>JID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grupos ?? []).map((grupo) => (
                  <TableRow key={grupo.id}>
                    <TableCell>{grupo.nome ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{grupo.grupo_jid}</TableCell>
                    <TableCell>
                      <Badge className={grupo.ativo ? "bg-pos/10 text-pos" : "bg-muted text-muted-foreground"}>
                        {grupo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ToggleGrupoButton id={grupo.id} ativo={grupo.ativo} />
                        <DeleteButton
                          action={deleteGrupo.bind(null, grupo.id)}
                          confirmMessage="Desvincular este grupo? Mensagens dele deixarão de ser processadas."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de mensagens processadas</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {(historico ?? []).length === 0 ? (
            <div className="px-6">
              <EmptyState
                icon={MessageCircle}
                title="Nenhuma mensagem processada ainda"
                description="Mande um áudio, foto de comprovante ou /gasto e /ganho no grupo vinculado."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(historico ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDateTime(item.criado_em)}</TableCell>
                    <TableCell>{LANCAMENTO_ORIGEM_LABEL[item.origem]}</TableCell>
                    <TableCell>
                      {item.payload?.itens?.length
                        ? item.payload.itens.map((i) => i.categoria).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.payload?.itens?.length
                        ? item.payload.itens
                            .map((i) => (i.valor !== null ? formatCurrency(i.valor) : "—"))
                            .join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={RASCUNHO_STATUS_BADGE_CLASS[item.status]}>
                        {RASCUNHO_STATUS_LABEL[item.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
