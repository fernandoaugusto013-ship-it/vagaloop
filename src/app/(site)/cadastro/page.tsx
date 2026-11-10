import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/misc";
import { SignUpForm } from "@/components/auth/forms";
import { safePath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

type Props = { searchParams: Promise<{ perfil?: string; voltar?: string }> };
const MAP = { empresa: "company", candidato: "candidate", recrutadora: "recruiter" } as const;

export default async function Cadastro({ searchParams }: Props) {
  const sp = await searchParams;
  const perfil = MAP[(sp.perfil ?? "empresa") as keyof typeof MAP] ?? "company";
  const voltar = safePath(sp.voltar, "") || undefined;
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-center text-3xl font-extrabold tracking-tight">Crie sua conta grátis</h1>
      <p className="mt-2 text-center text-muted">Empresas publicam vagas sem cartão. Candidatos se candidatam em poucos cliques.</p>
      <Card className="mt-8"><SignUpForm initialPerfil={perfil} voltar={voltar} /></Card>
      <p className="mt-6 text-center text-sm text-muted">Já tem conta? <Link href="/entrar" className="font-semibold text-brand hover:underline">Entrar</Link></p>
    </div>
  );
}
