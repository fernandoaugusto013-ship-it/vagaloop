import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Notice, PageHeader } from "@/components/ui/misc";
import { ManualWorkspace } from "@/components/jobs/manual-workspace";
import { requireCompany } from "@/lib/auth";
import type { PartialJobDraft } from "@/lib/job-schema";

export default async function EditarVaga({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, company } = await requireCompany();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ data: job }, { data: questions }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("job_screening_questions").select("question, kind, options, is_knockout, expected_answer").eq("job_id", id).order("position"),
  ]);
  if (!job) notFound();
  const draft: PartialJobDraft = {
    title: job.title, contract_type: job.contract_type, work_mode: job.work_mode, city: job.city, uf: job.uf,
    salary_min: job.salary_min, salary_max: job.salary_max, salary_period: job.salary_period, salary_negotiable: job.salary_negotiable,
    description: job.description, responsibilities: job.responsibilities, requirements: job.requirements, nice_to_have: job.nice_to_have,
    benefits: job.benefits, workload: job.workload, sector: job.sector, seniority: job.seniority, is_confidential: job.is_confidential,
    positions: job.positions, expires_at: job.expires_at ? job.expires_at.slice(0, 10) : null, screening_questions: questions ?? [],
  };
  return (
    <>
      <PageHeader title="Editar vaga" description={<span className="flex items-center gap-2"><Badge tone={job.status === "publicada" ? "mint" : "neutral"}>{job.status}</Badge>{job.status === "publicada" ? <Link href={`/vagas/${job.city_slug}/${job.slug}`} className="text-brand hover:underline">Ver página pública</Link> : null}</span>}
        actions={<Link href={`/empresa/vagas/${id}/pipeline`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand">Ver candidatos</Link>} />
      {job.status === "suspensa" ? <Notice tone="danger" className="mb-6 max-w-4xl" title="Vaga suspensa pela moderação">Ela não aparece no site. Fale com o suporte para revisar.</Notice> : null}
      <Card className="max-w-4xl"><ManualWorkspace companyName={company.name} initial={draft} jobId={id} /></Card>
    </>
  );
}
