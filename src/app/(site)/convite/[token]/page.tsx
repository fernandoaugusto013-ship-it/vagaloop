import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Notice } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Convite", robots: { index: false } };

export default async function Convite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/.test(token)) redirect("/");
  const session = await getSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="space-y-4 text-center">
          <h1 className="text-2xl font-extrabold">Você foi convidado(a) para um time</h1>
          <p className="text-muted">Entre ou crie sua conta com o e-mail que recebeu o convite.</p>
          <div className="flex justify-center gap-2">
            <ButtonLink href={`/entrar?voltar=/convite/${token}`}>Entrar</ButtonLink>
            <ButtonLink href={`/cadastro?perfil=empresa&voltar=/convite/${token}`} variant="secondary">Criar conta</ButtonLink>
          </div>
        </Card>
      </div>
    );
  }
  const { error } = await session.supabase.rpc("accept_company_invite", { invite_token: token });
  if (!error) redirect("/empresa");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Notice tone="danger" title="Não foi possível aceitar o convite">{error.message}</Notice>
    </div>
  );
}
