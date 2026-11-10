import type { Metadata } from "next";
import { AppShell } from "@/components/app/shell";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Área do candidato", robots: { index: false } };

export default async function CandidatoLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("candidate");
  return (
    <AppShell area="Candidato" user={{ name: profile.full_name }} nav={[
      { href: "/candidato", label: "Minhas candidaturas", exact: true },
      { href: "/candidato/perfil", label: "Meu perfil" },
      { href: "/vagas", label: "Buscar vagas" },
      { href: "/candidato/privacidade", label: "Privacidade e dados" },
    ]}>
      {children}
    </AppShell>
  );
}
