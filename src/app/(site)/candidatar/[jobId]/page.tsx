import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, Notice } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ApplyForm } from "@/components/candidate/apply-form";
import { getSession, HOME_BY_ROLE } from "@/lib/auth";
import { getJobQuestions } from "@/lib/public-data";
import { formatSalary, jobPath } from "@/lib/format";
import type { PublicJob } from "@/lib/types";

export const metadata: Metadata = { title: "Candidatar-se", robots: { index: false } };

export default async function Candidatar({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(jobId)) notFound();
  const session = await getSession();
  if (!session) redirect(`/entrar?voltar=/candidatar/${jobId}`);
  const { supabase, profile, user } = session;

  const { data: job } = await supabase.from("jobs_public").select("*").eq("id", jobId).maybeSingle<PublicJob>();
  if (!job) notFound();
  const company = job.is_confidential ? "Empresa confidencial" : job.company_name;

  if (profile.role !== "candidate") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <Notice tone="amber" title="Candidaturas são feitas com conta de candidato">Você está conectado(a) como {profile.role === "company" ? "empresa" : profile.role === "recruiter" ? "recrutadora" : "admin"}. <Link href={HOME_BY_ROLE[profile.role]} className="font-semibold underline">Voltar ao painel</Link></Notice>
      </div>
    );
  }

  const [{ data: existing }, questions, { data: cand }, { count: cvCount }] = await Promise.all([
    supabase.from("application_status").select("application_id").eq("job_id", jobId).maybeSingle(),
    getJobQuestions(jobId),
    supabase.from("candidate_profiles").select("headline, skills, experiences").eq("user_id", user.id).single(),
    supabase.from("resumes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const thin = !cvCount && !cand?.headline && !(cand?.skills?.length) && !(cand?.experiences?.length);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href={jobPath(job)} className="text-sm font-semibold text-muted hover:text-brand">← Voltar para a vaga</Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{job.title}</h1>
      <p className="mt-1 text-muted">{company} · {formatSalary(job)}</p>
      {existing ? (
        <Card className="mt-8 space-y-3">
          <p className="font-bold">Você já se candidatou a esta vaga.</p>
          <ButtonLink href="/candidato">Acompanhar candidatura</ButtonLink>
        </Card>
      ) : (
        <>
          {thin ? (
            <Notice tone="amber" className="mt-6" title="Seu perfil está vazio">
              A empresa vê seu perfil profissional e a IA usa ele para calcular a aderência. <Link href="/candidato/perfil" className="font-semibold underline">Envie seu currículo</Link> antes (leva 1 minuto) ou continue mesmo assim.
            </Notice>
          ) : null}
          <Card className="mt-6"><ApplyForm jobId={jobId} questions={questions} /></Card>
        </>
      )}
    </div>
  );
}
