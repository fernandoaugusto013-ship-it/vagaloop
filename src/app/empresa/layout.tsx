import type { Metadata } from "next";
import { AppShell } from "@/components/app/shell";
import { getMyCompany, requireRole } from "@/lib/auth";

// Área logada: sempre por requisição (sessão + RLS), nunca pré-renderizada.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Painel da empresa", robots: { index: false } };

export default async function EmpresaLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("company", "admin");
  const mine = await getMyCompany();
  const nav = mine
    ? [
        { href: "/empresa", label: "Visão geral", exact: true },
        { href: "/empresa/vagas", label: "Vagas" },
        { href: "/empresa/vagas/nova", label: "Nova vaga" },
        { href: "/empresa/perfil", label: "Perfil da empresa" },
        { href: "/empresa/equipe", label: "Equipe" },
      ]
    : [{ href: "/empresa/onboarding", label: "Cadastro da empresa" }];
  return (
    <AppShell area="Empresa" nav={nav} user={{ name: profile.full_name, subtitle: mine?.company.name }}>
      {children}
    </AppShell>
  );
}
