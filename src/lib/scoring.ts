import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeMatch, type MatchInput } from "@/lib/ai/match";
import { embed } from "@/lib/ai/provider";

const jobText = (j: { title: string; description: string; requirements: string[]; nice_to_have: string[] }) =>
  [j.title, j.description, ...j.requirements, ...j.nice_to_have].join("\n");

/**
 * Calcula match score + justificativa de uma candidatura e grava (service_role).
 * Chamado logo após a candidatura (via after()) — meta: < 60 s.
 */
export async function scoreApplication(applicationId: string) {
  const db = createAdminClient();
  if (!db) return { ok: false as const, reason: "SUPABASE_SERVICE_ROLE_KEY ausente" };

  const { data: app } = await db.from("applications")
    .select("id, job_id, candidate_id, external_candidate, answers, knockout_failed").eq("id", applicationId).single();
  if (!app) return { ok: false as const, reason: "candidatura não encontrada" };

  const [{ data: job }, { data: questions }, { data: cand }] = await Promise.all([
    db.from("jobs").select("*").eq("id", app.job_id).single(),
    db.from("job_screening_questions").select("id, question, is_knockout").eq("job_id", app.job_id),
    app.candidate_id
      ? db.from("candidate_profiles").select("*").eq("user_id", app.candidate_id).single()
      : Promise.resolve({ data: null }),
  ]);
  if (!job) return { ok: false as const, reason: "vaga não encontrada" };

  // Só dados profissionais; nome, contato e PCD ficam de fora de propósito.
  const ext = (app.external_candidate ?? {}) as { resumo?: string };
  const candidate: MatchInput["candidate"] = cand
    ? {
        headline: cand.headline, summary: cand.summary, city: cand.city, uf: cand.uf,
        salary_expectation: cand.salary_expectation, skills: cand.skills ?? [],
        experiences: cand.experiences ?? [], education: cand.education ?? [], languages: cand.languages ?? [],
        pref_work_modes: cand.pref_work_modes ?? [],
      }
    : { headline: null, summary: ext.resumo ?? null, city: null, uf: null, salary_expectation: null, skills: [],
        experiences: [], education: [], languages: [], pref_work_modes: [] };

  let similarity: number | null = null;
  if (cand) {
    let jobVec = job.embedding;
    if (!jobVec) {
      const v = await embed(jobText(job));
      if (v) { await db.from("jobs").update({ embedding: JSON.stringify(v) }).eq("id", job.id); jobVec = v; }
    }
    if (!cand.embedding) {
      const v = await embed([candidate.headline, candidate.summary, candidate.skills.join(", "),
        ...candidate.experiences.map((e) => `${e.cargo}: ${e.descricao ?? ""}`)].filter(Boolean).join("\n"));
      if (v) await db.from("candidate_profiles").update({ embedding: JSON.stringify(v) }).eq("user_id", cand.user_id);
    }
    if (jobVec) {
      const { data } = await db.rpc("embedding_similarity", { job: job.id, candidate: cand.user_id });
      similarity = typeof data === "number" ? data : null;
    }
  }

  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  const screening = ((app.answers ?? []) as { question_id: string; answer: string }[])
    .filter((a) => byId.has(a.question_id))
    .map((a) => ({ question: byId.get(a.question_id)!.question, answer: a.answer, is_knockout: byId.get(a.question_id)!.is_knockout }));

  try {
    const r = await computeMatch({
      job: {
        title: job.title, seniority: job.seniority, contract_type: job.contract_type, work_mode: job.work_mode,
        city: job.city, uf: job.uf, salary_min: job.salary_min, salary_max: job.salary_max,
        requirements: job.requirements, nice_to_have: job.nice_to_have, responsibilities: job.responsibilities,
        description: job.description,
      },
      candidate, screening, knockout_failed: app.knockout_failed, embedding_similarity: similarity,
    });
    await db.from("applications").update({
      match_score: r.score, ai_status: "ok", ai_scored_at: new Date().toISOString(),
      ai_summary: { resumo: r.resumo, pontos_fortes: r.pontos_fortes, lacunas: r.lacunas, alertas: r.alertas, modo: r.mode },
    }).eq("id", applicationId);
    return { ok: true as const, score: r.score };
  } catch (err) {
    await db.from("applications").update({ ai_status: "erro" }).eq("id", applicationId);
    return { ok: false as const, reason: String(err) };
  }
}
