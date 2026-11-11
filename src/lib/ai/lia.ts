import "server-only";
import { getLlm, parseJson, type ChatMessage } from "./provider";
import { findSkills, norm } from "./text";
import { missingFields, type PartialJobDraft } from "@/lib/job-schema";
import { UFS } from "@/lib/constants";

export type LiaTurn = { reply: string; draft: PartialJobDraft; missing: string[]; ready: boolean; mode: "ia" | "heuristico" };

const SYSTEM = `Você é a Lia, assistente da VagaLoop que ajuda empresas brasileiras a criar vagas em poucos minutos.
Fale em português do Brasil, com frases curtas e tom profissional e caloroso.

A cada mensagem, atualize o rascunho da vaga com o que a empresa disse e pergunte UMA coisa por vez sobre o que faltar,
nesta ordem: cargo, tipo de contrato, modalidade, cidade/UF (se não for remoto), faixa salarial (ou "a combinar"),
requisitos obrigatórios x desejáveis, benefícios, jornada. Quando tudo estiver preenchido, escreva a descrição,
as responsabilidades e sugira até 3 perguntas de triagem objetivas (sim/não ou número), marcando como knockout
apenas o que for requisito eliminatório real.

Regras:
- Nunca invente salário, benefício ou requisito que a empresa não disse. Você pode SUGERIR, deixando claro que é sugestão.
- Linguagem inclusiva e sem discriminação: nada de idade, gênero, aparência, estado civil, religião ou "boa aparência".
- Se a vaga for confidencial, não mencione o nome da empresa na descrição.
- contract_type: clt | pj | temporario | estagio | freelancer. work_mode: presencial | remoto | hibrido.
- salary_period: mensal | hora | bolsa (use bolsa para estágio). Valores numéricos em reais, sem símbolo.
- seniority: estagio | junior | pleno | senior | especialista | gestao. uf: sigla de 2 letras.

Responda SOMENTE com JSON neste formato:
{"reply": "sua mensagem para a empresa", "draft": { ...campos atualizados da vaga... }, "ready": true|false}
Campos do draft: title, contract_type, work_mode, city, uf, salary_min, salary_max, salary_period, salary_negotiable,
description, responsibilities[], requirements[], nice_to_have[], benefits[], workload, sector, seniority,
is_confidential, positions, screening_questions[{question, kind, is_knockout, expected_answer}].`;

export async function liaTurn(history: ChatMessage[], draft: PartialJobDraft): Promise<LiaTurn> {
  const llm = getLlm();
  if (llm) {
    try {
      const text = await llm.complete({
        system: SYSTEM,
        maxTokens: 2500,
        messages: [
          ...history.slice(-16),
          { role: "user", content: `Rascunho atual (JSON): ${JSON.stringify(draft)}\n\nResponda no formato combinado.` },
        ],
      });
      const out = parseJson<{ reply: string; draft: PartialJobDraft; ready?: boolean }>(text);
      const merged = { ...draft, ...clean(out.draft ?? {}) };
      const missing = missingFields(merged);
      return { reply: out.reply, draft: merged, missing, ready: missing.length === 0, mode: "ia" };
    } catch (err) {
      console.error("[lia] falha no provedor, usando modo heurístico:", err);
    }
  }
  return heuristicTurn(history, draft);
}

function clean(d: PartialJobDraft): PartialJobDraft {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) if (v !== null && v !== undefined && v !== "") out[k] = v;
  if (typeof out.uf === "string") out.uf = (out.uf as string).toUpperCase();
  return out as PartialJobDraft;
}

// ------------------------------------------------------------------ modo heurístico (sem LLM)
const QUESTIONS: Record<string, string> = {
  cargo: "Para começar: qual é o cargo da vaga? Se puder, já me conte em poucas palavras o que a pessoa vai fazer.",
  contrato: "Qual o tipo de contrato: CLT, PJ, temporário, estágio ou freelancer?",
  modalidade: "A vaga é presencial, híbrida ou remota?",
  local: "Em qual cidade e estado? Por exemplo: Recife/PE.",
  salario: "Qual a faixa salarial? Pode ser algo como \"R$ 4.000 a 5.500\" ou \"a combinar\".",
  requisitos: "Quais são os requisitos obrigatórios? E, se houver, o que é desejável (diferencial)? Pode listar separando por vírgula.",
  beneficios: "Quais benefícios a vaga oferece? Ex.: VR, plano de saúde, auxílio home office.",
  jornada: "Qual a jornada? Ex.: segunda a sexta, 9h às 18h.",
};

function heuristicTurn(history: ChatMessage[], draft: PartialJobDraft): LiaTurn {
  const last = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const asked = lastAsked(history);
  const d: PartialJobDraft = { ...draft };
  const t = norm(last);

  // contrato
  if (/\bclt\b/.test(t)) d.contract_type = "clt";
  else if (/\bpj\b|pessoa juridica/.test(t)) d.contract_type = "pj";
  else if (/estagi/.test(t)) { d.contract_type = "estagio"; d.salary_period = "bolsa"; d.seniority ??= "estagio"; }
  else if (/temporari/.test(t)) d.contract_type = "temporario";
  else if (/freela/.test(t)) d.contract_type = "freelancer";

  // modalidade
  if (/hibrid/.test(t)) d.work_mode = "hibrido";
  else if (/remot|home ?office|100% online/.test(t) && !/auxilio home/.test(t)) d.work_mode = "remoto";
  else if (/presencial/.test(t)) d.work_mode = "presencial";

  // local "Cidade/UF" ou "Cidade - UF"
  const loc = last.match(/([A-ZÀ-Ú][\p{L}' ]{2,40}?)\s*[\/\-–,]\s*([A-Z]{2})\b/u);
  if (loc && (UFS as readonly string[]).includes(loc[2])) { d.city = loc[1].trim(); d.uf = loc[2] as PartialJobDraft["uf"]; }

  // salário
  if (/a combinar|negociavel|combinar/.test(t)) d.salary_negotiable = true;
  const nums = [...last.matchAll(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d{3,6})(?:,\d{2})?(\s*mil)?/gi)]
    .map((m) => Number(m[1].replace(/\./g, "")) * (m[2] ? 1000 : 1))
    .filter((n) => n >= 300 && n <= 200_000);
  if (nums.length && (asked === "salario" || /r\$|salari|remunera|bolsa/.test(t))) {
    d.salary_min = Math.min(...nums);
    d.salary_max = nums.length > 1 ? Math.max(...nums) : null;
    d.salary_negotiable = false;
  }

  // senioridade
  if (/\bjunior|\bjr\b/.test(t)) d.seniority = "junior";
  else if (/\bpleno\b/.test(t)) d.seniority = "pleno";
  else if (/\bsenior|\bsr\b/.test(t)) d.seniority = "senior";

  // respostas em lista para a pergunta feita
  const items = splitList(last);
  if (asked === "cargo" || (!d.title && history.filter((m) => m.role === "user").length === 1)) {
    const title = extractTitle(last);
    if (title.length >= 3) d.title = title;
    const skills = findSkills(last);
    if (skills.length && !d.requirements?.length) d.requirements = skills;
  } else if (asked === "requisitos" && items.length) {
    const [must, nice] = last.split(/desej[aá]ve(?:l|is)|diferencia(?:l|is)/i);
    d.requirements = splitList(must);
    if (nice) d.nice_to_have = splitList(nice);
  } else if (asked === "beneficios" && items.length) {
    d.benefits = items;
  } else if (asked === "jornada" && last.trim().length > 2) {
    d.workload = last.trim().slice(0, 200);
  }

  const missing = missingFields(d);
  if (missing.length) {
    const ack = history.filter((m) => m.role === "user").length > 1 ? "Anotado. " : "Oi! Eu sou a Lia e vou montar a vaga com você. ";
    return { reply: ack + QUESTIONS[missing[0]], draft: d, missing, ready: false, mode: "heuristico" };
  }

  d.description ||= buildDescription(d);
  if (!d.responsibilities?.length) d.responsibilities = [];
  if (!d.screening_questions?.length) d.screening_questions = suggestQuestions(d);
  return {
    reply: "Pronto! Montei o rascunho com descrição e perguntas de triagem. Revise os campos ao lado e publique quando estiver tudo certo.",
    draft: d, missing, ready: true, mode: "heuristico",
  };
}

function lastAsked(history: ChatMessage[]) {
  const lastBot = [...history].reverse().find((m) => m.role === "assistant")?.content ?? "";
  return Object.entries(QUESTIONS).find(([, q]) => lastBot.endsWith(q))?.[0] ?? null;
}

function splitList(s: string) {
  return s.split(/[,;\n•]|\se\s/).map((x) => x.replace(/^[\s\-–*:]+|[\s.]+$/g, "")).filter((x) => x.length > 1).slice(0, 15).map(capitalize);
}

/** "Preciso de uma analista de dados pleno, CLT, ..." → "Analista de Dados Pleno" */
export function extractTitle(text: string) {
  const first = text.split(/[,;:\n!?]|\s[-–]\s|\.(?!\d)/)[0];
  const cleaned = first
    .replace(/^\s*(oi|olá|bom dia|boa tarde)[,!\s]*/i, "")
    .replace(/^(preciso( contratar)?|procuro|quero contratar|estou contratando|estamos contratando|buscamos|contratamos|abrir (uma )?vaga)\s+/i, "")
    .replace(/^(de|para|por)\s+/i, "")
    .replace(/^(vaga|uma vaga)\s+(de|para)\s+/i, "")
    .replace(/^(um|uma|uns|umas|o|a)\s+/i, "")
    .replace(/\s+(clt|pj|est[aá]gio|tempor[aá]rio|freela\w*|remot[oa]|h[ií]brid[oa]|presencial)\b.*$/i, "")
    .trim();
  const small = new Set(["de", "da", "do", "das", "dos", "e", "em", "para", "com"]);
  return cleaned.slice(0, 120).split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : /^[A-Z0-9]{2,}$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function buildDescription(d: PartialJobDraft) {
  const where = d.work_mode === "remoto" ? "em regime remoto" : `${d.work_mode === "hibrido" ? "em modelo híbrido" : "presencialmente"} em ${d.city}/${d.uf}`;
  return `Buscamos uma pessoa para atuar como ${d.title}, ${where}. ` +
    (d.requirements?.length ? `É essencial ter ${d.requirements.slice(0, 4).join(", ").toLowerCase()}. ` : "") +
    "Revise e complemente este texto com o contexto do time e os principais desafios da posição.";
}

function suggestQuestions(d: PartialJobDraft) {
  const qs: NonNullable<PartialJobDraft["screening_questions"]> = [];
  if (d.work_mode && d.work_mode !== "remoto") {
    qs.push({ question: `Você tem disponibilidade para trabalhar ${d.work_mode === "hibrido" ? "em modelo híbrido" : "presencialmente"} em ${d.city}/${d.uf}?`, kind: "yes_no", options: [], is_knockout: true, expected_answer: "sim" });
  }
  if (d.requirements?.[0]) {
    qs.push({ question: `Quantos anos de experiência você tem com ${d.requirements[0]}?`, kind: "number", options: [], is_knockout: false, expected_answer: null });
  }
  return qs;
}
