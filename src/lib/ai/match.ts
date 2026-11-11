import "server-only";
import { getLlm, parseJson } from "./provider";
import { norm, tokens } from "./text";
import type { AiSummary } from "@/lib/types";

/**
 * Entrada do match SEM dados que possam discriminar: nada de nome, gênero, idade, foto, PCD ou contato.
 * O chamador (lib/scoring.ts) monta este objeto a partir do perfil profissional.
 */
export type MatchInput = {
  job: {
    title: string; seniority: string | null; contract_type: string; work_mode: string; city: string | null; uf: string | null;
    salary_min: number | null; salary_max: number | null; requirements: string[]; nice_to_have: string[];
    responsibilities: string[]; description: string;
  };
  candidate: {
    headline: string | null; summary: string | null; city: string | null; uf: string | null;
    salary_expectation: number | null; skills: string[];
    experiences: { cargo: string; empresa?: string; inicio?: string; fim?: string; descricao?: string }[];
    education: { curso: string; nivel?: string }[]; languages: { idioma: string; nivel: string }[];
    pref_work_modes: string[];
  };
  screening: { question: string; answer: string; is_knockout: boolean }[];
  knockout_failed: boolean;
  /** 0–1, quando há embeddings dos dois lados */
  embedding_similarity: number | null;
};

export type MatchResult = AiSummary & { score: number; mode: "ia" | "heuristico" };

const SYSTEM = `Você avalia a aderência entre um currículo e uma vaga para apoiar uma recrutadora no Brasil.
Dê uma nota de 0 a 100 e uma justificativa curta. A decisão final é sempre humana: você só ajuda a priorizar.

Critérios: requisitos obrigatórios atendidos (peso maior), experiência relevante e senioridade, diferenciais,
compatibilidade de modalidade/local e de pretensão salarial, respostas de triagem.
Proibido considerar ou inferir idade, gênero, raça, religião, deficiência, estado civil, aparência ou nome.
Se faltar informação, diga isso como lacuna em vez de supor.

Responda SOMENTE com JSON:
{"score": 0-100, "resumo": "1-2 frases", "pontos_fortes": ["..."], "lacunas": ["..."], "alertas": ["..."]}
Máximo de 4 itens por lista, cada item com até 15 palavras.`;

export async function computeMatch(input: MatchInput): Promise<MatchResult> {
  const llm = getLlm();
  if (llm) {
    try {
      const text = await llm.complete({ system: SYSTEM, maxTokens: 700, messages: [{ role: "user", content: JSON.stringify(input) }] });
      const r = parseJson<AiSummary & { score: number }>(text);
      let score = clamp(Math.round(Number(r.score)));
      if (input.embedding_similarity != null) score = clamp(Math.round(score * 0.8 + input.embedding_similarity * 100 * 0.2));
      if (input.knockout_failed) score = Math.min(score, 30);
      return {
        score, mode: "ia", resumo: String(r.resumo ?? ""),
        pontos_fortes: arr(r.pontos_fortes), lacunas: arr(r.lacunas),
        alertas: input.knockout_failed ? ["Não atende a uma pergunta eliminatória", ...arr(r.alertas)].slice(0, 4) : arr(r.alertas),
      };
    } catch (err) {
      console.error("[match] falha no provedor, usando modo heurístico:", err);
    }
  }
  return heuristicMatch(input);
}

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
const arr = (v: unknown) => (Array.isArray(v) ? v.map(String).slice(0, 4) : []);

/** Explicável de propósito: cada ponto vem de uma regra que a recrutadora consegue verificar. */
export function heuristicMatch(input: MatchInput): MatchResult {
  const { job, candidate } = input;
  const corpus = norm([
    candidate.headline, candidate.summary, candidate.skills.join(" "),
    ...candidate.experiences.map((e) => `${e.cargo} ${e.descricao ?? ""}`),
    ...candidate.education.map((e) => e.curso),
    ...candidate.languages.map((l) => `${l.idioma} ${l.nivel}`),
  ].filter(Boolean).join(" \n "));
  const corpusTokens = new Set(tokens(corpus));
  const has = (req: string) => {
    const t = tokens(req);
    if (!t.length) return false;
    const hits = t.filter((x) => corpusTokens.has(x) || corpus.includes(x)).length;
    return hits / t.length >= 0.6;
  };

  const strengths: string[] = [];
  const gaps: string[] = [];
  const alerts: string[] = [];

  const reqHit = job.requirements.filter(has);
  const reqMiss = job.requirements.filter((r) => !has(r));
  const reqScore = job.requirements.length ? reqHit.length / job.requirements.length : 0.5;
  if (reqHit.length) strengths.push(`Atende a ${reqHit.length} de ${job.requirements.length} requisitos: ${reqHit.slice(0, 3).join(", ")}`);
  reqMiss.slice(0, 3).forEach((r) => gaps.push(`Não encontrado no perfil: ${r}`));

  const niceHit = job.nice_to_have.filter(has);
  const niceScore = job.nice_to_have.length ? niceHit.length / job.nice_to_have.length : 0;
  if (niceHit.length) strengths.push(`Diferenciais: ${niceHit.slice(0, 3).join(", ")}`);

  const titleTokens = tokens(job.title).filter((t) => !["pleno", "junior", "senior", "jr", "sr"].includes(t));
  const relevantExp = candidate.experiences.filter((e) => titleTokens.some((t) => norm(e.cargo).includes(t)));
  const expScore = Math.min(1, relevantExp.length / 2);
  if (relevantExp.length) strengths.push(`Experiência como ${relevantExp[0].cargo}`);
  else if (!candidate.experiences.length) gaps.push("Perfil sem experiências cadastradas");

  let fit = 1;
  if (job.work_mode !== "remoto" && job.city && candidate.city && norm(job.city) !== norm(candidate.city)) {
    fit -= 0.4; alerts.push(`Mora em ${candidate.city}${candidate.uf ? "/" + candidate.uf : ""}; vaga em ${job.city}/${job.uf}`);
  }
  if (candidate.pref_work_modes.length && !candidate.pref_work_modes.includes(job.work_mode)) {
    fit -= 0.3; alerts.push("Modalidade da vaga fora das preferências do candidato");
  }
  const top = job.salary_max ?? job.salary_min;
  if (top && candidate.salary_expectation && candidate.salary_expectation > top * 1.15) {
    fit -= 0.3; alerts.push("Pretensão salarial acima da faixa da vaga");
  }

  let score = 100 * (0.55 * reqScore + 0.15 * niceScore + 0.2 * expScore + 0.1 * Math.max(0, fit));
  if (input.embedding_similarity != null) score = score * 0.7 + input.embedding_similarity * 100 * 0.3;
  if (input.knockout_failed) { score = Math.min(score, 30); alerts.unshift("Não atende a uma pergunta eliminatória"); }
  score = clamp(Math.round(score));

  const resumo = score >= 75 ? "Perfil com boa aderência aos requisitos principais."
    : score >= 50 ? "Aderência parcial: vale olhar as lacunas antes de avançar."
    : "Baixa aderência aos requisitos informados na vaga.";
  return { score, mode: "heuristico", resumo, pontos_fortes: strengths.slice(0, 4), lacunas: gaps.slice(0, 4), alertas: alerts.slice(0, 4) };
}
