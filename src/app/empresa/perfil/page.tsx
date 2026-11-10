import Link from "next/link";
import { Card, Notice, PageHeader } from "@/components/ui/misc";
import { CompanyForm } from "@/components/company/company-form";
import { updateCompany } from "@/app/actions/company";
import { requireCompany } from "@/lib/auth";

export default async function PerfilEmpresa() {
  const { company, memberRole } = await requireCompany();
  return (
    <>
      <PageHeader title="Perfil da empresa" description={<>Página pública: <Link href={`/empresas/${company.slug}`} className="font-semibold text-brand hover:underline">/empresas/{company.slug}</Link></>} />
      {memberRole !== "owner" ? <Notice tone="amber" className="mb-6 max-w-3xl">Você pode ver, mas só quem administra a empresa edita o perfil.</Notice> : null}
      <Card className="max-w-3xl"><CompanyForm action={updateCompany} company={company} submitLabel="Salvar alterações" withLogo /></Card>
    </>
  );
}
