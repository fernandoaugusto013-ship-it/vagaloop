import "server-only";
import { getLlm, parseJson } from "./provider";
import { findSkills } from "./text";

export type ParsedResume = {
  profile: {
    headline: string | null; summary: string | null; city: string | null; uf: string | null;
    skills: string[];
    experiences: { empresa: string; cargo: string; inicio?: string; fim?: string; descricao?: string }[];
    education: { instituicao: string; curso: string; nivel?: string; inicio?: string; fim?: string }[];
    languages: { idioma: string; nivel: string }[];
    links: { rotulo: string; url: string }[];
  };
  /** Guardado só em candidate_contacts (protegido). Nunca vai para resumes.parsed. */
  contact: { email: string | null; phone: string | null; linkedin_url: string | null };
  mode: "ia" | "heuristico";
};

export async function extractText(file: Blob, mime: string): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  if (mime === "application/pdf") {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await pdfText(pdf, { mergePages: true });
    return text;
  }
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
  return value;
}

/** Confere a assinatura do arquivo (não confiar só no tipo informado pelo navegador). */
export function sniffMime(bytes: Uint8Array): "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

const SYSTEM = `Extraia dados estruturados de um currículo brasileiro. Responda SOMENTE com JSON:
{"profile": {"headline": "objetivo/cargo atual", "summary": "resumo em até 3 frases", "city": "", "uf": "XX",
  "skills": [""], "experiences": [{"empresa": "", "cargo": "", "inicio": "AAAA-MM", "fim": "AAAA-MM ou vazio se atual", "descricao": ""}],
  "education": [{"instituicao": "", "curso": "", "nivel": "", "inicio": "", "fim": ""}],
  "languages": [{"idioma": "", "nivel": ""}], "links": [{"rotulo": "", "url": ""}]},
 "contact": {"email": "", "phone": "", "linkedin_url": ""}}
Não inclua idade, data de nascimento, estado civil, CPF, foto, endereço completo ou gênero em nenhum campo.
Links: só portfólio/GitHub/site profissional (LinkedIn vai em contact). Use null para o que não existir.`;

export async function parseResume(text: string): Promise<ParsedResume> {
  const trimmed = text.replace(/\s+\n/g, "\n").slice(0, 30_000);
  const llm = getLlm();
  if (llm) {
    try {
      const out = parseJson<Omit<ParsedResume, "mode">>(await llm.complete({ system: SYSTEM, maxTokens: 3000, messages: [{ role: "user", content: trimmed }] }));
      return { profile: normalizeProfile(out.profile), contact: normalizeContact(out.contact, trimmed), mode: "ia" };
    } catch (err) {
      console.error("[cv] falha no provedor, usando modo heurístico:", err);
    }
  }
  return heuristicParse(trimmed);
}

function normalizeProfile(p: Partial<ParsedResume["profile"]> | undefined): ParsedResume["profile"] {
  const list = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]).slice(0, 20) : []);
  return {
    headline: p?.headline || null, summary: p?.summary || null, city: p?.city || null,
    uf: p?.uf && /^[A-Za-z]{2}$/.test(p.uf) ? p.uf.toUpperCase() : null,
    skills: list<string>(p?.skills).map(String).filter(Boolean),
    experiences: list(p?.experiences), education: list(p?.education), languages: list(p?.languages),
    links: list<{ rotulo: string; url: string }>(p?.links).filter((l) => /^https?:\/\//.test(l?.url ?? "")),
  };
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/;
const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i;

function normalizeContact(c: Partial<ParsedResume["contact"]> | undefined, text: string): ParsedResume["contact"] {
  return {
    email: c?.email || text.match(EMAIL)?.[0] || null,
    phone: c?.phone || text.match(PHONE)?.[0] || null,
    linkedin_url: c?.linkedin_url || text.match(LINKEDIN)?.[0] || null,
  };
}

function heuristicParse(text: string): ParsedResume {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const cleanLines = lines.filter((l) => !EMAIL.test(l) && !PHONE.test(l) && !LINKEDIN.test(l));
  const loc = text.match(/([A-ZÀ-Ú][\p{L} ]{2,30})\s*[\/\-–]\s*([A-Z]{2})\b/u);
  const links = [...text.matchAll(/https?:\/\/(?:www\.)?(github\.com|gitlab\.com|behance\.net|[a-z0-9-]+\.(?:dev|io|com\.br))\/?[^\s)]*/gi)]
    .filter((m) => !/linkedin/i.test(m[0])).slice(0, 5).map((m) => ({ rotulo: m[1], url: m[0] }));
  const languages = [
    ...(/ingl[eê]s/i.test(text) ? [{ idioma: "Inglês", nivel: nivel(text, "ingl") }] : []),
    ...(/espanhol/i.test(text) ? [{ idioma: "Espanhol", nivel: nivel(text, "espanhol") }] : []),
  ];
  return {
    profile: {
      headline: cleanLines[1]?.slice(0, 120) ?? null,
      summary: cleanLines.slice(2, 5).join(" ").slice(0, 500) || null,
      city: loc?.[1]?.trim() ?? null, uf: loc?.[2] ?? null,
      skills: findSkills(text), experiences: [], education: [], languages, links,
    },
    contact: normalizeContact(undefined, text),
    mode: "heuristico",
  };
}

function nivel(text: string, key: string) {
  const near = text.toLowerCase().split(key)[1]?.slice(0, 40) ?? "";
  if (/fluente|avançad/.test(near)) return "Avançado";
  if (/intermedi/.test(near)) return "Intermediário";
  if (/b[aá]sic/.test(near)) return "Básico";
  return "Não informado";
}
