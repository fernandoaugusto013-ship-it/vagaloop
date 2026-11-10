import type { Metadata } from "next";
import { AppShell } from "@/components/app/shell";
import { requireRole } from "@/lib/auth";

// Área logada: sempre por requisição (sessão + RLS), nunca pré-renderizada.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Área da recrutadora", robots: { index: false } };

export default async function RecrutadoraLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("recruiter");
  return (
    <AppShell area="Recrutadora" user={{ name: profile.full_name }} nav={[{ href: "/recrutadora", label: "Início", exact: true }]}>
      {children}
    </AppShell>
  );
}
