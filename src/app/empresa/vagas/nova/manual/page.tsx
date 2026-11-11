import { Card, PageHeader } from "@/components/ui/misc";
import { ManualWorkspace } from "@/components/jobs/manual-workspace";
import { requireCompany } from "@/lib/auth";

export default async function NovaVagaManual() {
  const { company } = await requireCompany();
  return (
    <>
      <PageHeader title="Nova vaga" />
      <Card className="max-w-4xl"><ManualWorkspace companyName={company.name} /></Card>
    </>
  );
}
