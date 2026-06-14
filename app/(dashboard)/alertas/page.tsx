import { Bell, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/shared/delete-button";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import type { Alerta } from "@/lib/types";
import { deleteAlerta, marcarAlertaLido, marcarTodosLidos } from "./actions";

export default async function AlertasPage() {
  const supabase = await createClient();
  const { data: alertas } = await supabase
    .from("alertas")
    .select("id, tipo, mensagem, lido, created_at")
    .order("created_at", { ascending: false })
    .returns<Alerta[]>();

  const lista = alertas ?? [];
  const naoLidos = lista.filter((alerta) => !alerta.lido).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Alertas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {naoLidos > 0 ? `${naoLidos} alerta(s) não lido(s).` : "Tudo em dia."}
          </p>
        </div>
        {naoLidos > 0 ? (
          <form action={marcarTodosLidos}>
            <Button type="submit" variant="outline" size="sm">
              <BellOff />
              Marcar todos como lidos
            </Button>
          </form>
        ) : null}
      </div>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum alerta registrado.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((alerta) => (
            <Card key={alerta.id} className={alerta.lido ? "opacity-60" : undefined}>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{alerta.tipo}</Badge>
                      {!alerta.lido ? <Badge className="bg-info/10 text-info">Não lido</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-foreground">{alerta.mensagem}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(alerta.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <form action={marcarAlertaLido.bind(null, alerta.id, !alerta.lido)}>
                    <Button type="submit" variant="outline" size="sm">
                      {alerta.lido ? "Marcar não lido" : "Marcar lido"}
                    </Button>
                  </form>
                  <DeleteButton
                    action={deleteAlerta.bind(null, alerta.id)}
                    confirmMessage="Excluir este alerta? Essa ação não pode ser desfeita."
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
