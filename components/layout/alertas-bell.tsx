"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";
import type { Alerta } from "@/lib/types";

export function AlertasBell({
  alertas,
  naoLidos,
}: {
  alertas: Pick<Alerta, "id" | "tipo" | "mensagem" | "created_at">[];
  naoLidos: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" className="relative">
            <Bell />
            {naoLidos > 0 ? (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center bg-neg/10 px-1 text-neg">
                {naoLidos}
              </Badge>
            ) : null}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Alertas</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {alertas.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum alerta novo.</div>
        ) : (
          alertas.map((alerta) => (
            <DropdownMenuItem key={alerta.id} className="flex flex-col items-start gap-0.5">
              <span className="text-sm text-foreground">{alerta.mensagem}</span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(alerta.created_at)}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/alertas" />}>Ver todos os alertas</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
