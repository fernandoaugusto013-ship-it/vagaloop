import { z } from "zod";
import { CONTRACT_TYPES, SALARY_PERIODS, SENIORITIES, UFS, WORK_MODES } from "./constants";

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const list = z.array(z.string().trim().min(1).max(300)).max(30).default([]);
const optionalText = z.string().trim().max(200).optional().nullable().transform((v) => (v ? v : null));
const money = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v),
  z.number().nonnegative().max(1_000_000).nullable(),
);

export const screeningQuestionSchema = z.object({
  question: z.string().trim().min(3).max(300),
  kind: z.enum(["yes_no", "text", "number", "choice"]).default("yes_no"),
  options: z.array(z.string().trim().min(1)).max(10).default([]),
  is_knockout: z.boolean().default(false),
  expected_answer: z.string().trim().max(100).optional().nullable().transform((v) => (v ? v : null)),
});

export const jobDraftSchema = z
  .object({
    title: z.string().trim().min(3, "Informe o título").max(140),
    contract_type: z.enum(keys(CONTRACT_TYPES)),
    work_mode: z.enum(keys(WORK_MODES)),
    city: optionalText,
    uf: z.enum(UFS).optional().nullable(),
    salary_min: money,
    salary_max: money,
    salary_period: z.enum(keys(SALARY_PERIODS)).default("mensal"),
    salary_negotiable: z.boolean().default(false),
    description: z.string().trim().max(8000).default(""),
    responsibilities: list,
    requirements: list,
    nice_to_have: list,
    benefits: list,
    workload: optionalText,
    sector: optionalText,
    seniority: z.enum(keys(SENIORITIES)).optional().nullable(),
    is_confidential: z.boolean().default(false),
    positions: z.coerce.number().int().min(1).max(500).default(1),
    expires_at: z.string().optional().nullable().transform((v) => (v ? v : null)),
    screening_questions: z.array(screeningQuestionSchema).max(10).default([]),
  })
  .superRefine((d, ctx) => {
    if (d.work_mode !== "remoto" && (!d.city || !d.uf)) {
      ctx.addIssue({ code: "custom", path: ["city"], message: "Vagas presenciais e híbridas precisam de cidade e UF" });
    }
    if (d.salary_min != null && d.salary_max != null && d.salary_max < d.salary_min) {
      ctx.addIssue({ code: "custom", path: ["salary_max"], message: "O máximo precisa ser maior que o mínimo" });
    }
  });

export type JobDraft = z.infer<typeof jobDraftSchema>;

/** Rascunho parcial que a Lia vai preenchendo durante a conversa. */
export type PartialJobDraft = Partial<Omit<JobDraft, "screening_questions">> & {
  screening_questions?: z.infer<typeof screeningQuestionSchema>[];
};

/** Itens que a Lia precisa perguntar antes de considerar o rascunho pronto. */
export function missingFields(d: PartialJobDraft) {
  const missing: string[] = [];
  if (!d.title) missing.push("cargo");
  if (!d.contract_type) missing.push("contrato");
  if (!d.work_mode) missing.push("modalidade");
  if (d.work_mode && d.work_mode !== "remoto" && (!d.city || !d.uf)) missing.push("local");
  if (!d.salary_negotiable && d.salary_min == null && d.salary_max == null) missing.push("salario");
  if (!d.requirements?.length) missing.push("requisitos");
  if (!d.benefits?.length) missing.push("beneficios");
  if (!d.workload) missing.push("jornada");
  return missing;
}
