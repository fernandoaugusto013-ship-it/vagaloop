import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Notice, PageHeader } from "@/components/ui/misc";
import { PipelineBoard } from "@/components/pipeline/board";
import { StageEditor } from "@/components/pipeline/stage-editor";
import { ManualCandidateForm } from "@/components/pipeline/manual-candidate";
import type { PipelineCard } from "@/components/pipeline/types";
import { requireCompany } from "@/lib/auth";

export default async function Pipeline({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase, company } = await requireCompany();
  const [{ data: job }, { data: stages }, { data: apps }] = await Promise.all([
    supabase.from("jobs").select("id, title, status, slug, city_slug").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("pipeline_stages").select("id, name, kind, position").eq("job_id", id).order("position"),
    supabase.from("applications")
      .select("id, stage_id, match_score, ai_status, ai_summary, rating, tags, knockout_failed, source, created_at, external_candidate, candidate:profiles!applications_candidate_id_fkey(full_name, candidate_profiles(headline, city, uf))")
      .eq("job_id", id).order("match_score", { ascending: false, nullsFirst: false }).limit(1000),
  ]);
  if (!job) notFound();

  const cards: PipelineCard[] = (apps ?? []).map((a) => {
    const cand = a.candidate as unknown as { full_name: string; candidate_profiles: { headline: string | null; city: string | null; uf: string | null } | null } | null;
    const ext = a.external_candidate as { nome?: string } | null;
    const cp = cand?.candidate_profiles;
    return {
      id: a.id, stage_id: a.stage_id, match_score: a.match_score, ai_status: a.ai_status, ai_summary: a.ai_summary,
      rating: a.rating, tags: a.tags, knockout_failed: a.knockout_failed, source: a.source, created_at: a.created_at,
      name: cand?.full_name || ext?.nome || "Candidato", headline: cp?.headline ?? null, place: cp?.city ? `${cp.city}${cp.uf ? "/" + cp.uf : ""}` : null,
    };
  });

  return (
    <>
      <PageHeader
        title={job.title}
        description={<span className="flex flex-wrap items-center gap-2"><Badge tone={job.status === "publicada" ? "mint" : "neutral"}>{job.status}</Badge>{cards.length} candidatos, ordenados por aderência</span>}
        actions={<>
          <Link href={`/empresa/vagas/${id}/editar`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand">Editar vaga</Link>
          {job.status === "publicada" ? <Link href={`/vagas/${job.city_slug}/${job.slug}`} className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-brand">Página pública</Link> : null}
        </>}
      />
      <Notice tone="neutral" className="mb-5">
        <strong>Sobre o índice de aderência:</strong> calculado por IA a partir do perfil profissional, das respostas de triagem e dos requisitos da vaga.
        Não usa nome, gênero, idade, foto ou deficiência. É um apoio para priorizar: a decisão é sempre de uma pessoa do seu time.
      </Notice>
      <PipelineBoard jobId={id} stages={stages ?? []} cards={cards} />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card><details><summary className="cursor-pointer font-bold">Adicionar candidato manualmente</summary><div className="mt-4"><ManualCandidateForm jobId={id} /></div></details></Card>
        <Card><details><summary className="cursor-pointer font-bold">Editar etapas desta vaga</summary><div className="mt-4"><StageEditor jobId={id} stages={stages ?? []} /></div></details></Card>
      </div>
    </>
  );
}
