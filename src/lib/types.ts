import type { ContractType, SalaryPeriod, Seniority, WorkMode } from "./constants";

export type UserRole = "admin" | "company" | "recruiter" | "candidate";

export type Profile = { id: string; role: UserRole; full_name: string; avatar_url: string | null };

export type PublicJob = {
  id: string; slug: string; city_slug: string; title: string;
  contract_type: ContractType; work_mode: WorkMode; city: string | null; uf: string | null;
  salary_min: number | null; salary_max: number | null; salary_period: SalaryPeriod; salary_negotiable: boolean;
  description: string; responsibilities: string[]; requirements: string[]; nice_to_have: string[]; benefits: string[];
  workload: string | null; sector: string | null; seniority: Seniority | null; positions: number;
  expires_at: string | null; published_at: string; updated_at: string; is_confidential: boolean;
  company_id: string | null; company_slug: string | null; company_name: string | null; company_logo_url: string | null;
  company_website: string | null; company_about: string | null; company_verified: boolean;
};

export type Job = Omit<PublicJob, "company_slug" | "company_name" | "company_logo_url" | "company_website" | "company_about" | "company_verified" | "published_at"> & {
  company_id: string; status: "rascunho" | "publicada" | "pausada" | "encerrada" | "suspensa";
  published_at: string | null; created_via: "manual" | "lia"; is_managed: boolean; created_at: string;
};

export type ScreeningQuestion = {
  id: string; job_id: string; position: number; question: string;
  kind: "yes_no" | "text" | "number" | "choice"; options: string[]; is_knockout: boolean; expected_answer: string | null;
};

export type Stage = { id: string; job_id: string; position: number; name: string; kind: string; notify_template: string | null };

export type AiSummary = { resumo: string; pontos_fortes: string[]; lacunas: string[]; alertas: string[] };

export type Application = {
  id: string; job_id: string; candidate_id: string | null; stage_id: string | null;
  external_candidate: { nome?: string; email?: string; telefone?: string; resumo?: string } | null;
  source: "plataforma" | "manual" | "indicacao"; answers: { question_id: string; answer: string }[];
  knockout_failed: boolean; match_score: number | null; ai_summary: AiSummary | null;
  ai_status: "pendente" | "ok" | "erro"; rating: number | null; tags: string[]; hired_at: string | null;
  created_at: string; updated_at: string;
};

export type CandidateProfile = {
  user_id: string; headline: string | null; summary: string | null; city: string | null; uf: string | null;
  salary_expectation: number | null;
  experiences: { empresa: string; cargo: string; inicio?: string; fim?: string; descricao?: string }[];
  education: { instituicao: string; curso: string; nivel?: string; inicio?: string; fim?: string }[];
  skills: string[]; languages: { idioma: string; nivel: string }[]; links: { rotulo: string; url: string }[];
  is_pcd: boolean; pcd_details: string | null;
  pref_work_modes: WorkMode[]; pref_cities: string[]; pref_contracts: ContractType[];
};

export type Company = {
  id: string; slug: string; cnpj: string | null; legal_name: string | null; name: string; size: string | null;
  sector: string | null; logo_url: string | null; website: string | null; description: string | null;
  culture: string | null; city: string | null; uf: string | null; is_verified: boolean;
};
