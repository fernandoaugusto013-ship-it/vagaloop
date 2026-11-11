import type { Metadata } from "next";
import { AppShell } from "@/components/app/shell";
import { requireRole } from "@/lib/auth";

// Área logada: sempre por requisição (sessão + RLS), nunca pré-renderizada.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("admin");
  return (
    <AppShell area="Super Admin" user={{ name: profile.full_name, subtitle: "Administrador" }} nav={[
      { href: "/admin", label: "Métricas", exact: true },
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/vagas", label: "Vagas e moderação" },
      { href: "/admin/empresas", label: "Empresas" },
      { href: "/admin/usuarios", label: "Usuários" },
      { href: "/admin/configuracoes", label: "Configurações comerciais" },
      { href: "/admin/conteudo", label: "FAQ e depoimentos" },
    ]}>
      {children}
    </AppShell>
  );
}
