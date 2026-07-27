import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/layout/admin-tabs";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("role, perfil_id")
      .eq("id", user.id)
      .single();

    if (usuario && usuario.role !== "admin") {
      let temAcessoAdmin = false;

      if (usuario.perfil_id) {
        const { data: perfil } = await supabase
          .from("perfis_acesso")
          .select("paginas")
          .eq("id", usuario.perfil_id)
          .single();

        temAcessoAdmin = ((perfil?.paginas ?? []) as string[]).some((pagina) =>
          pagina.startsWith("/admin/"),
        );
      }

      if (!temAcessoAdmin) {
        redirect("/");
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs />
      {children}
    </div>
  );
}
