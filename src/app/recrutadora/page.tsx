import { Card, Notice, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";

export default async function RecrutadoraHome() {
  const { profile } = await requireRole("recruiter");
  return (
    <>
      <PageHeader title={`Olá, ${profile.full_name.split(" ")[0] || "recrutadora"}!`} description="Sua conta de recrutadora está criada." />
      <Notice title="O programa abre na Fase 3">
        Assinatura, marketplace de oportunidades, financeiro, trilha de método e comunidade chegam na próxima etapa do produto.
        Avisaremos você por e-mail assim que sua turma abrir.
      </Notice>
      <Card className="mt-6">
        <h2 className="font-bold">Enquanto isso</h2>
        <p className="mt-1 text-sm text-muted">Veja como funciona o programa e simule seus ganhos.</p>
        <ButtonLink href="/recrutadores" variant="secondary" className="mt-4">Conhecer o programa</ButtonLink>
      </Card>
    </>
  );
}
