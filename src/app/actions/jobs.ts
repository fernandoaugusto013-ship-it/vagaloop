"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/auth";
import { jobDraftSchema, type JobDraft, type PartialJobDraft } from "@/lib/job-schema";
import { liaTurn, type LiaTurn } from "@/lib/ai/lia";
import type { ChatMessage } from "@/lib/ai/provider";
import { scoreApplication } from "@/lib/scoring";
import { processOutbox } from "@/lib/email";

export type SaveResult = { ok: true; id: string; path: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const uuid = z.string().uuid();

export async function saveJob(input: { id?: string | null; draft: JobDraft; publish: boolean; via: "manual" | "lia" }): Promise<SaveResult> {
  const { supabase, company } = await requireCompany();
  const parsed = jobDraftSchema.safeParse(input.draft);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Confira os campos destacados.", fieldErrors };
  }
  const { screening_questions, ...job } = parsed.data;
  const row = {
    ...job,
    city: job.work_mode === "remoto" && !job.city ? null : job.city,
    uf: job.work_mode === "remoto" && !job.city ? null : job.uf ?? null,
    salary_min: job.salary_negotiable ? null : job.salary_min,
    salary_max: job.salary_negotiable ? null : job.salary_max,
    expires_at: job.expires_at ? new Date(`${job.expires_at}T23:59:59-03:00`).toISOString() : null,
  };

  let id = input.id ?? null;
  if (id) {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Vaga inválida." };
    const { data: current } = await supabase.from("jobs").select("status").eq("id", id).single();
    if (!current) return { ok: false, error: "Vaga não encontrada." };
    const status = input.publish ? "publicada" : current.status;
    const { error } = await supabase.from("jobs").update({ ...row, status }).eq("id", id);
    if (error) return { ok: false, error: error.message.includes("suspensa") ? error.message : "Não foi possível salvar a vaga." };
  } else {
    const { data, error } = await supabase.from("jobs")
      .insert({ ...row, company_id: company.id, status: input.publish ? "publicada" : "rascunho", created_via: input.via })
      .select("id").single();
    if (error || !data) return { ok: false, error: "Não foi possível criar a vaga." };
    id = data.id;
  }

  // perguntas de triagem: substitui o conjunto
  await supabase.from("job_screening_questions").delete().eq("job_id", id);
  if (screening_questions.length) {
    const { error } = await supabase.from("job_screening_questions").insert(
      screening_questions.map((q, position) => ({
        ...q, job_id: id, position,
        is_knockout: q.kind !== "text" && q.is_knockout,
        expected_answer: !q.is_knockout || q.kind === "text" ? null
          : q.kind === "yes_no" ? (/^n/i.test(q.expected_answer ?? "") ? "nao" : "sim")
          : q.expected_answer,
      })),
    );
    if (error) return { ok: false, error: "Vaga salva, mas as perguntas de triagem falharam. Revise e salve de novo." };
  }

  const { data: saved } = await supabase.from("jobs").select("slug, city_slug, status").eq("id", id).single();
  revalidatePath("/empresa/vagas");
  revalidatePath("/vagas");
  revalidatePath("/");
  return { ok: true, id: id!, path: saved?.status === "publicada" ? `/vagas/${saved.city_slug}/${saved.slug}` : `/empresa/vagas/${id}/editar` };
}

export async function setJobStatus(form: FormData) {
  const { supabase } = await requireCompany();
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["publicada", "pausada", "encerrada"]).parse(form.get("status"));
  await supabase.from("jobs").update({ status }).eq("id", id);
  revalidatePath("/empresa/vagas");
  revalidatePath(`/empresa/vagas/${id}/pipeline`);
  revalidatePath("/vagas");
}

const historySchema = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(40);

export async function talkToLia(history: ChatMessage[], draft: PartialJobDraft): Promise<LiaTurn> {
  await requireCompany();
  const h = historySchema.parse(history);
  return liaTurn(h, draft ?? {});
}

// ------------------------------------------------------------------ pipeline

export async function moveApplications(ids: string[], stageId: string) {
  const { supabase } = await requireCompany();
  const parsedIds = z.array(uuid).min(1).max(200).parse(ids);
  uuid.parse(stageId);
  const { data, error } = await supabase.from("applications").update({ stage_id: stageId }).in("id", parsedIds).select("id, job_id");
  if (error) return { ok: false as const, error: error.message.includes("Etapa") ? error.message : "Não foi possível mover." };
  // gatilho já registrou histórico e enfileirou e-mails; despacha após a resposta
  after(() => processOutbox());
  if (data?.[0]) revalidatePath(`/empresa/vagas/${data[0].job_id}/pipeline`);
  return { ok: true as const, moved: data?.length ?? 0 };
}

export async function updateApplication(id: string, patch: { rating?: number | null; tags?: string[] }) {
  const { supabase } = await requireCompany();
  uuid.parse(id);
  const clean = z.object({
    rating: z.number().int().min(1).max(5).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  }).parse(patch);
  const { error } = await supabase.from("applications").update(clean).eq("id", id);
  return { ok: !error };
}

export async function addNote(applicationId: string, body: string) {
  const { supabase } = await requireCompany();
  uuid.parse(applicationId);
  const text = z.string().trim().min(1).max(4000).parse(body);
  const { error } = await supabase.from("notes").insert({ application_id: applicationId, body: text });
  revalidatePath(`/empresa/candidaturas/${applicationId}`);
  return { ok: !error };
}

export async function rescore(applicationId: string) {
  const { supabase } = await requireCompany();
  uuid.parse(applicationId);
  // confere acesso via RLS antes de usar o service_role
  const { data } = await supabase.from("applications").select("id, job_id").eq("id", applicationId).single();
  if (!data) return { ok: false as const };
  const r = await scoreApplication(applicationId);
  revalidatePath(`/empresa/vagas/${data.job_id}/pipeline`);
  return r;
}

const manualSchema = z.object({
  job_id: uuid,
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().trim().max(30).optional(),
  resumo: z.string().trim().max(6000).optional(),
});

export type ManualState = { error?: string; ok?: boolean };

export async function addManualCandidate(_: ManualState, form: FormData): Promise<ManualState> {
  const { supabase } = await requireCompany();
  const parsed = manualSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { job_id, ...cand } = parsed.data;
  const { data, error } = await supabase.from("applications")
    .insert({ job_id, source: "manual", external_candidate: { ...cand, email: cand.email || undefined } })
    .select("id").single();
  if (error || !data) return { error: "Não foi possível adicionar." };
  after(() => scoreApplication(data.id));
  revalidatePath(`/empresa/vagas/${job_id}/pipeline`);
  return { ok: true };
}

// ------------------------------------------------------------------ etapas editáveis por vaga

export async function renameStage(stageId: string, name: string) {
  const { supabase } = await requireCompany();
  uuid.parse(stageId);
  const { error } = await supabase.from("pipeline_stages").update({ name: z.string().trim().min(2).max(40).parse(name) }).eq("id", stageId);
  return { ok: !error };
}

export async function addStage(jobId: string, name: string, afterPosition: number) {
  const { supabase } = await requireCompany();
  uuid.parse(jobId);
  const label = z.string().trim().min(2).max(40).parse(name);
  const { data: stages } = await supabase.from("pipeline_stages").select("id, position").eq("job_id", jobId).order("position", { ascending: false });
  // abre espaço (posições únicas são verificadas só no commit)
  for (const s of stages ?? []) if (s.position > afterPosition) await supabase.from("pipeline_stages").update({ position: s.position + 1 }).eq("id", s.id);
  const { error } = await supabase.from("pipeline_stages").insert({ job_id: jobId, name: label, kind: "custom", position: afterPosition + 1 });
  revalidatePath(`/empresa/vagas/${jobId}/pipeline`);
  return { ok: !error };
}

export async function removeStage(stageId: string) {
  const { supabase } = await requireCompany();
  uuid.parse(stageId);
  const { error } = await supabase.from("pipeline_stages").delete().eq("id", stageId);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
