export const CONTRACT_TYPES = {
  clt: "CLT",
  pj: "PJ",
  temporario: "Temporário",
  estagio: "Estágio",
  freelancer: "Freelancer",
} as const;
export type ContractType = keyof typeof CONTRACT_TYPES;

export const WORK_MODES = { presencial: "Presencial", remoto: "Remoto", hibrido: "Híbrido" } as const;
export type WorkMode = keyof typeof WORK_MODES;

export const SALARY_PERIODS = { mensal: "por mês", hora: "por hora", bolsa: "bolsa-auxílio" } as const;
export type SalaryPeriod = keyof typeof SALARY_PERIODS;

export const SENIORITIES = {
  estagio: "Estágio",
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
  gestao: "Gestão",
} as const;
export type Seniority = keyof typeof SENIORITIES;

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;

export const SECTORS = [
  "Tecnologia", "Varejo", "Indústria", "Saúde", "Educação", "Finanças", "Logística",
  "Serviços", "Construção", "Agronegócio", "Marketing e Comunicação", "Jurídico",
  "Alimentação", "Hotelaria e Turismo", "Recursos Humanos", "Outro",
] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
  "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
  SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

/** Rótulo da etapa visto pelo candidato (mais gentil que o nome interno). */
export function candidateStageLabel(kind: string, name: string) {
  if (kind === "reprovado") return "Processo encerrado";
  if (kind === "inscritos") return "Candidatura enviada";
  return name;
}

export const TERMS_VERSION = "2026-11";
