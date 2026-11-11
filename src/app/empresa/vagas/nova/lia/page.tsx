import { PageHeader } from "@/components/ui/misc";
import { LiaWorkspace } from "@/components/jobs/lia-workspace";
import { requireCompany } from "@/lib/auth";

export default async function NovaVagaLia() {
  const { company } = await requireCompany();
  return (
    <>
      <PageHeader title="Criar vaga com a Lia" description="Tudo o que a Lia preencher aparece no rascunho ao lado. Você revisa e publica." />
      <LiaWorkspace companyName={company.name} />
    </>
  );
}
