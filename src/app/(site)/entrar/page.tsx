import type { Metadata } from "next";
import Link from "next/link";
import { Card, Notice } from "@/components/ui/misc";
import { SignInForm, SocialButtons } from "@/components/auth/forms";
import { safePath } from "@/lib/safe-redirect";
import { isDemo } from "@/lib/env";
import { demoLogin } from "@/app/actions/auth";

const PERSONAS = [
  ["empresa@vagaloop.dev", "Empresa", "Marina, da Maré Analytics: vagas, Lia e pipeline"],
  ["candidata@vagaloop.dev", "Candidata", "Júlia: perfil, candidaturas e status"],
  ["admin@vagaloop.dev", "Admin", "Métricas, leads, moderação e configurações"],
  ["recrutadora@vagaloop.dev", "Recrutadora", "Área da recrutadora (Fase 3)"],
];

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

type Props = { searchParams: Promise<{ voltar?: string; erro?: string }> };

export default async function Entrar({ searchParams }: Props) {
  const sp = await searchParams;
  const voltar = safePath(sp.voltar, "") || undefined;
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-center text-3xl font-extrabold tracking-tight">Entrar na VagaLoop</h1>
      {isDemo ? (
        <Card className="mt-8">
          <h2 className="font-bold">Entrar na demonstração</h2>
          <p className="mt-1 text-sm text-muted">Escolha um perfil fictício. Senha de todos: demo12345.</p>
          <div className="mt-4 grid gap-2">
            {PERSONAS.map(([email, label, desc]) => (
              <form key={email} action={demoLogin}>
                <input type="hidden" name="email" value={email} />
                {voltar ? <input type="hidden" name="voltar" value={voltar} /> : null}
                <button className="w-full rounded-xl border border-line p-3 text-left hover:border-brand">
                  <span className="block font-semibold">{label}</span><span className="text-sm text-muted">{desc}</span>
                </button>
              </form>
            ))}
          </div>
        </Card>
      ) : null}
      <Card className="mt-8 space-y-6">
        {sp.erro ? <Notice tone="danger">{sp.erro === "oauth" ? "Não conseguimos conectar com o provedor. Tente de novo." : "Link inválido ou expirado. Entre novamente."}</Notice> : null}
        <SocialButtons voltar={voltar} />
        <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>
        <SignInForm voltar={voltar} />
      </Card>
      <p className="mt-6 text-center text-sm text-muted">Ainda não tem conta? <Link href={`/cadastro${voltar ? `?voltar=${encodeURIComponent(voltar)}&perfil=candidato` : ""}`} className="font-semibold text-brand hover:underline">Cadastre-se grátis</Link></p>
    </div>
  );
}
