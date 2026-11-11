import type { Metadata } from "next";
import Link from "next/link";
import { Card, Notice } from "@/components/ui/misc";
import { SignInForm, SocialButtons } from "@/components/auth/forms";
import { safePath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

type Props = { searchParams: Promise<{ voltar?: string; erro?: string }> };

export default async function Entrar({ searchParams }: Props) {
  const sp = await searchParams;
  const voltar = safePath(sp.voltar, "") || undefined;
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-center text-3xl font-extrabold tracking-tight">Entrar na VagaLoop</h1>
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
