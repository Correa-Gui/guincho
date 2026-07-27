import { LogOut } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AlertasBell } from "@/components/layout/alertas-bell";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import type { Alerta } from "@/lib/types";
import { logout } from "./actions";

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: alertasNaoLidos, count: naoLidos } = await supabase
    .from("alertas")
    .select("id, tipo, mensagem, created_at", { count: "exact" })
    .eq("lido", false)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Alerta[]>();

  let paginasPermitidas: string[] | null = null;

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role, perfil_id")
      .eq("id", user.id)
      .single();

    if (usuario && usuario.role !== "admin") {
      if (usuario.perfil_id) {
        const { data: perfil } = await supabase
          .from("perfis_acesso")
          .select("paginas")
          .eq("id", usuario.perfil_id)
          .single();

        paginasPermitidas = perfil?.paginas ?? [];
      } else {
        paginasPermitidas = [];
      }
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user?.email} paginasPermitidas={paginasPermitidas} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
          <SidebarTrigger />
          <div className="flex-1" />
          <AlertasBell alertas={alertasNaoLidos ?? []} naoLidos={naoLidos ?? 0} />
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              <LogOut />
              Sair
            </Button>
          </form>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
          <div className="mx-auto w-full max-w-screen-2xl min-w-0">{children}</div>
        </main>
      </SidebarInset>
      {modal}
    </SidebarProvider>
  );
}
