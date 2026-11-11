// Roda com: npm run test:unit  (sem chave de IA, testa os modos heurísticos)
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractTitle, liaTurn } from "@/lib/ai/lia";
import { heuristicMatch, type MatchInput } from "@/lib/ai/match";
import { isValidCnpj } from "@/lib/cnpj";
import { missingFields } from "@/lib/job-schema";
import type { ChatMessage } from "@/lib/ai/provider";

delete process.env.ANTHROPIC_API_KEY;

test("CNPJ: dígitos verificadores", () => {
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(isValidCnpj("11.222.333/0001-82"), false);
  assert.equal(isValidCnpj("00000000000000"), false);
});

test("Lia (modo básico): conversa completa gera rascunho pronto", async () => {
  const say = async (h: ChatMessage[], d: object, text: string) => {
    const hist: ChatMessage[] = [...h, { role: "user", content: text }];
    const r = await liaTurn(hist, d);
    return { hist: [...hist, { role: "assistant" as const, content: r.reply }], r };
  };
  // o formulário começa com listas vazias, como na tela
  const empty = { responsibilities: [], requirements: [], nice_to_have: [], benefits: [], screening_questions: [] };
  let s = await say([{ role: "assistant", content: "Oi" }], empty, "Preciso de uma analista de dados pleno, CLT, híbrido em Recife/PE, R$ 6.000 a 7.500");
  assert.equal(s.r.draft.contract_type, "clt");
  assert.equal(s.r.draft.work_mode, "hibrido");
  assert.equal(s.r.draft.city, "Recife");
  assert.equal(s.r.draft.uf, "PE");
  assert.equal(s.r.draft.salary_min, 6000);
  assert.equal(s.r.draft.salary_max, 7500);
  assert.equal(s.r.draft.seniority, "pleno");
  assert.ok(s.r.draft.title?.toLowerCase().includes("analista de dados"));
  assert.deepEqual(s.r.missing, ["requisitos", "beneficios", "jornada"]);
  s = await say(s.hist, s.r.draft, "SQL, Power BI, Excel avançado. Desejável: Python");
  assert.deepEqual(s.r.draft.requirements, ["SQL", "Power BI", "Excel avançado"]);
  assert.deepEqual(s.r.draft.nice_to_have, ["Python"]);
  s = await say(s.hist, s.r.draft, "VR, plano de saúde, auxílio home office");
  s = await say(s.hist, s.r.draft, "Segunda a sexta, 9h às 18h");
  assert.equal(s.r.ready, true);
  assert.equal(missingFields(s.r.draft).length, 0);
  assert.ok((s.r.draft.screening_questions ?? []).some((q) => q.is_knockout));
  assert.ok(s.r.draft.description && s.r.draft.description.length > 40);
});

const job: MatchInput["job"] = {
  title: "Analista de Dados Pleno", seniority: "pleno", contract_type: "clt", work_mode: "hibrido", city: "Recife", uf: "PE",
  salary_min: 6000, salary_max: 7500, requirements: ["SQL", "Power BI", "Excel avançado"], nice_to_have: ["Python"],
  responsibilities: [], description: "",
};
const base: MatchInput["candidate"] = {
  headline: "Analista de Dados", summary: "BI para varejo", city: "Recife", uf: "PE", salary_expectation: 7000,
  skills: ["SQL", "Power BI", "Excel avançado", "Python"], experiences: [{ cargo: "Analista de Dados", descricao: "Painéis" }],
  education: [], languages: [], pref_work_modes: ["hibrido"],
};

test("match heurístico: perfil aderente pontua alto e explica", () => {
  const r = heuristicMatch({ job, candidate: base, screening: [], knockout_failed: false, embedding_similarity: null });
  assert.ok(r.score >= 85, `score ${r.score}`);
  assert.ok(r.pontos_fortes.length > 0);
  assert.equal(r.lacunas.length, 0);
});

test("match heurístico: lacunas, alertas e knockout limitam o score", () => {
  const weak = heuristicMatch({ job, candidate: { ...base, skills: ["Excel avançado"], headline: "Assistente administrativo", summary: null, experiences: [], city: "Manaus", uf: "AM", salary_expectation: 15000, pref_work_modes: ["remoto"] }, screening: [], knockout_failed: false, embedding_similarity: null });
  assert.ok(weak.score < 50, `score ${weak.score}`);
  assert.ok(weak.lacunas.some((l) => l.includes("SQL")));
  assert.ok(weak.alertas.length >= 2);
  const ko = heuristicMatch({ job, candidate: base, screening: [], knockout_failed: true, embedding_similarity: null });
  assert.ok(ko.score <= 30);
  assert.match(ko.alertas[0], /eliminatória/);
});

test("Lia: extrai o cargo da primeira frase", () => {
  assert.equal(extractTitle("Preciso de um analista financeiro pleno, CLT, híbrido em Recife/PE, R$ 5.000 a 6.500"), "Analista Financeiro Pleno");
  assert.equal(extractTitle("Preciso de uma analista de dados pleno, CLT, híbrido"), "Analista de Dados Pleno");
  assert.equal(extractTitle("Vaga de estágio em marketing, remoto, bolsa de R$ 1.500"), "Estágio em Marketing");
  assert.equal(extractTitle("Vendedor externo PJ em Curitiba/PR"), "Vendedor Externo");
  assert.equal(extractTitle("Estamos contratando desenvolvedor React sênior"), "Desenvolvedor React Sênior");
});
