"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Car,
  Warehouse,
  Wallet,
  Fuel,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const nav = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/viagens", label: "Viagens", icon: Truck },
  { href: "/patio", label: "Pátio", icon: Warehouse },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/frota", label: "Frota", icon: Car },
  { href: "/motoristas", label: "Motoristas", icon: UserRound },
  { href: "/abastecimentos", label: "Abastecimentos", icon: Fuel },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

const availableRoutes = new Set([
  "/",
  "/viagens",
  "/patio",
  "/financeiro",
  "/frota",
  "/motoristas",
  "/abastecimentos",
  "/admin",
]);

/** Item liberado se acesso é total (`null`), é a Início, ou alguma página do perfil está dentro dele. */
function itemPermitido(href: string, paginasPermitidas: string[] | null) {
  if (paginasPermitidas === null) return true;
  if (href === "/") return true;
  return paginasPermitidas.some((pagina) => pagina === href || pagina.startsWith(`${href}/`));
}

export function AppSidebar({
  userEmail,
  paginasPermitidas = null,
}: {
  userEmail?: string;
  /** Páginas liberadas pelo perfil de acesso do usuário. `null` = acesso total (ex: admin). */
  paginasPermitidas?: string[] | null;
}) {
  const pathname = usePathname();
  const initial = (userEmail ?? "?").charAt(0).toUpperCase();
  const itensVisiveis = nav.filter((item) => itemPermitido(item.href, paginasPermitidas));

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#ECD08C] via-[#D4A84A] to-[#B89238] text-sm font-extrabold text-background shadow-[0_4px_14px_rgba(212,168,74,0.25)]">
            G
          </div>
          <div className="leading-tight">
            <div className="text-base font-extrabold tracking-tight text-foreground">
              GuinchoFin
            </div>
            <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-gold">
              Gestão · Guincho
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itensVisiveis.map((item) => {
                const isAvailable = availableRoutes.has(item.href);
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(`${item.href}/`));

                if (!isAvailable) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        disabled
                        className="opacity-50"
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge>em breve</SidebarMenuBadge>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ECD08C] via-[#D4A84A] to-[#B89238] text-xs font-extrabold text-background">
            {initial}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-foreground">
              {userEmail ?? "Usuário"}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
