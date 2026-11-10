import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { CONTRACT_TYPES, WORK_MODES, UFS, type ContractType, type WorkMode } from "@/lib/constants";
import type { PublicJob } from "@/lib/types";

export const PAGE_SIZE = 20;

export type JobFilters = {
  q?: string; modalidade?: WorkMode; contrato?: ContractType; uf?: string; cidade?: string;
  salario?: number; dias?: number; setor?: string; cursor?: string;
};

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Lê filtros da URL validando cada valor (nada vai cru para a query). */
export function parseFilters(sp: Search): JobFilters {
  const modalidade = one(sp.modalidade);
  const contrato = one(sp.contrato);
  const uf = one(sp.uf)?.toUpperCase();
  const salario = Number(one(sp.salario));
  const dias = Number(one(sp.dias));
  return {
    q: one(sp.q)?.slice(0, 80),
    modalidade: modalidade && modalidade in WORK_MODES ? (modalidade as WorkMode) : undefined,
    contrato: contrato && contrato in CONTRACT_TYPES ? (contrato as ContractType) : undefined,
    uf: uf && (UFS as readonly string[]).includes(uf) ? uf : undefined,
    cidade: one(sp.cidade)?.replace(/[^a-z0-9-]/g, "").slice(0, 60) || undefined,
    salario: Number.isFinite(salario) && salario > 0 ? Math.min(salario, 1_000_000) : undefined,
    dias: [1, 3, 7, 15, 30].includes(dias) ? dias : undefined,
    setor: one(sp.setor)?.slice(0, 60),
    cursor: one(sp.cursor),
  };
}

const encodeCursor = (j: { published_at: string; id: string }) => Buffer.from(`${j.published_at}|${j.id}`).toString("base64url");
function decodeCursor(c?: string) {
  if (!c) return null;
  try {
    const [at, id] = Buffer.from(c, "base64url").toString().split("|");
    if (!/^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(at) || !/^[0-9a-f-]{36}$/.test(id)) return null;
    return { at, id };
  } catch {
    return null;
  }
}

const CARD_COLUMNS = "id, slug, city_slug, title, contract_type, work_mode, city, uf, salary_min, salary_max, salary_period, salary_negotiable, sector, seniority, published_at, is_confidential, company_slug, company_name, company_logo_url, company_verified";

export type JobCardData = Pick<PublicJob, "id" | "slug" | "city_slug" | "title" | "contract_type" | "work_mode" | "city" | "uf" |
  "salary_min" | "salary_max" | "salary_period" | "salary_negotiable" | "sector" | "seniority" | "published_at" |
  "is_confidential" | "company_slug" | "company_name" | "company_logo_url" | "company_verified">;

/** Listagem pública com paginação por cursor (published_at, id). */
export async function listJobs(f: JobFilters, pageSize = PAGE_SIZE) {
  const supabase = await createPublicClient();
  if (!supabase) return { jobs: [] as JobCardData[], nextCursor: null as string | null };

  let q = supabase.from("jobs_public").select(CARD_COLUMNS)
    .order("published_at", { ascending: false }).order("id", { ascending: false }).limit(pageSize + 1);
  if (f.q) q = q.textSearch("search", f.q, { type: "websearch", config: "portuguese" });
  if (f.modalidade) q = q.eq("work_mode", f.modalidade);
  if (f.contrato) q = q.eq("contract_type", f.contrato);
  if (f.uf) q = q.eq("uf", f.uf);
  if (f.cidade) q = q.eq("city_slug", f.cidade);
  if (f.setor) q = q.eq("sector", f.setor);
  if (f.salario) q = q.or(`salary_max.gte.${f.salario},and(salary_max.is.null,salary_min.gte.${f.salario})`);
  if (f.dias) q = q.gte("published_at", new Date(Date.now() - f.dias * 86_400_000).toISOString());
  const cur = decodeCursor(f.cursor);
  // valores com ":" e "." precisam de aspas na sintaxe or() do PostgREST
  if (cur) q = q.or(`published_at.lt."${cur.at}",and(published_at.eq."${cur.at}",id.lt.${cur.id})`);

  const { data, error } = await q;
  if (error) { console.error("[vagas]", error.message); return { jobs: [], nextCursor: null }; }
  const rows = (data ?? []) as JobCardData[];
  const hasMore = rows.length > pageSize;
  const jobs = rows.slice(0, pageSize);
  return { jobs, nextCursor: hasMore ? encodeCursor(jobs[jobs.length - 1]) : null };
}

export const getJob = cache(async (slug: string) => {
  const supabase = await createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.from("jobs_public").select("*").eq("slug", slug).maybeSingle<PublicJob>();
  return data;
});

export const getJobQuestions = cache(async (jobId: string) => {
  const supabase = await createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("job_screening_questions")
    .select("id, question, kind, options, is_knockout, position").eq("job_id", jobId).order("position");
  return data ?? [];
});

export const getCompanyPublic = cache(async (slug: string) => {
  const supabase = await createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.from("companies_public").select("*").eq("slug", slug).maybeSingle();
  return data;
});

export async function getStats() {
  const supabase = await createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.rpc("platform_stats");
  return data as { empresas: number; contratacoes: number; vagas_abertas: number } | null;
}

export async function getTopCities() {
  const supabase = await createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.rpc("top_job_cities", { max_rows: 12 });
  return (data ?? []) as { city_slug: string; city: string; uf: string; total: number }[];
}

export async function getFaqs(scope: "home" | "contratar" | "recrutadores" | "candidatos") {
  const supabase = await createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("faqs").select("id, question, answer").eq("scope", scope).eq("is_published", true).order("position");
  return data ?? [];
}

export async function getTestimonials(scope: "home" | "contratar" | "recrutadores") {
  const supabase = await createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("testimonials").select("id, author_name, author_role, company, quote, avatar_url")
    .eq("scope", scope).eq("is_published", true).order("position");
  return data ?? [];
}

export async function getClientLogos() {
  const supabase = await createPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("client_logos").select("id, name, logo_url, url").eq("is_published", true).order("position");
  return data ?? [];
}

/** Configurações comerciais públicas, com padrão seguro caso o banco não responda. */
export const getPublicSettings = cache(async () => {
  const defaults = {
    recruiter_monthly_fee: 490, recruiter_refund_days: 7, platform_split_pct: 50, guarantee_days: 30,
    finalists_count: 2, managed_ticket_reference: 3500, data_retention_months: 24, terms_version: "2026-11", dpo_contact: "privacidade@vagaloop.com.br",
    pricing_table: [] as { nivel: string; faixa_salarial: string; valor: number }[],
  };
  const supabase = await createPublicClient();
  if (!supabase) return defaults;
  const { data } = await supabase.from("settings_public").select("key, value");
  const out: Record<string, unknown> = { ...defaults };
  for (const row of data ?? []) out[row.key] = row.value;
  return out as typeof defaults;
});
