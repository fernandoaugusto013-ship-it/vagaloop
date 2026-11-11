import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/misc";
import { CompanyForm } from "@/components/company/company-form";
import { createCompany } from "@/app/actions/company";
import { getMyCompany, requireRole } from "@/lib/auth";

export default async function Onboarding() {
  const { profile } = await requireRole("company");
  if (await getMyCompany()) redirect("/empresa");
  return (
    <>
      <PageHeader title={`Bem-vindo(a), ${profile.full_name.split(" ")[0]}!`} description="Cadastre sua empresa em um minuto. Depois disso, a Lia ajuda você a publicar a primeira vaga." />
      <Card className="max-w-3xl"><CompanyForm action={createCompany} submitLabel="Salvar e criar a primeira vaga" /></Card>
    </>
  );
}
