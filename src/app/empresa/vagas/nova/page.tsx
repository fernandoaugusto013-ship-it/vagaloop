import Link from "next/link";
import { PageHeader } from "@/components/ui/misc";
import { LoopMark } from "@/components/logo";
import { requireCompany } from "@/lib/auth";

export default async function NovaVaga() {
  await requireCompany();
  return (
    <>
      <PageHeader title="Nova vaga" description="Converse com a Lia ou preencha o formulário. Publicar é grátis." />
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/empresa/vagas/nova/lia" className="group rounded-2xl border-2 border-brand bg-surface p-7 transition-shadow hover:shadow-card">
          <LoopMark className="h-7" animated />
          <h2 className="mt-4 text-xl font-bold">Criar com a Lia</h2>
          <p className="mt-1 text-muted">Descreva a vaga numa conversa. A Lia pergunta o que faltar e escreve descrição e perguntas de triagem.</p>
          <p className="mt-4 text-sm font-semibold text-brand">Leva uns 2 minutos →</p>
        </Link>
        <Link href="/empresa/vagas/nova/manual" className="rounded-2xl border border-line bg-surface p-7 transition-shadow hover:shadow-card">
          <h2 className="mt-11 text-xl font-bold">Preencher manualmente</h2>
          <p className="mt-1 text-muted">Já tem o texto pronto? Cole e ajuste os campos.</p>
          <p className="mt-4 text-sm font-semibold text-ink">Abrir formulário →</p>
        </Link>
      </div>
    </>
  );
}
