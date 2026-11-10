/** Normalização de texto para comparações heurísticas (sem acento, minúsculo). */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const STOP = new Set(["de", "da", "do", "das", "dos", "e", "em", "com", "para", "por", "a", "o", "as", "os", "um", "uma",
  "no", "na", "nos", "nas", "ou", "ter", "experiencia", "conhecimento", "conhecimentos", "anos", "ano", "boa", "bom", "nivel"]);

export function tokens(s: string) {
  return norm(s).split(/[^a-z0-9+#.]+/).map((t) => t.replace(/\.$/, "")).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Habilidades comuns reconhecidas no modo heurístico (o modo com LLM não depende desta lista). */
export const KNOWN_SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Vue", "Angular", "Python", "Django", "Java", "Spring",
  "C#", ".NET", "PHP", "Laravel", "Go", "Ruby", "SQL", "PostgreSQL", "MySQL", "MongoDB", "AWS", "Azure", "GCP",
  "Docker", "Kubernetes", "Git", "Figma", "UX", "Scrum", "Kanban", "Power BI", "Excel", "SAP", "Salesforce",
  "HubSpot", "Google Ads", "SEO", "Photoshop", "Illustrator", "Inglês", "Espanhol", "Contabilidade", "Fiscal",
  "Folha de pagamento", "Recrutamento", "Atendimento ao cliente", "Vendas", "Negociação", "Liderança",
  "Gestão de projetos", "Logística", "Compras", "Marketing digital", "Copywriting", "Análise de dados",
  "Machine Learning", "Flutter", "React Native", "Swift", "Kotlin", "Tailwind", "CSS", "HTML",
];

export function findSkills(text: string) {
  const t = ` ${norm(text)} `;
  return KNOWN_SKILLS.filter((s) => {
    const k = norm(s).replace(/[.+#]/g, (c) => `\\${c}`);
    return new RegExp(`[^a-z0-9]${k}[^a-z0-9]`).test(t);
  });
}
