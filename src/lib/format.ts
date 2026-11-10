import { SALARY_PERIODS, type SalaryPeriod } from "./constants";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export const formatBRL = (v: number | string | null | undefined) => (v == null || v === "" ? "" : brl.format(Number(v)));
export const formatDate = (d: string | Date | null | undefined) => (d ? dateFmt.format(new Date(d)) : "");
export const formatDateTime = (d: string | Date | null | undefined) => (d ? dateTimeFmt.format(new Date(d)) : "");

export function formatSalary(job: {
  salary_min: number | null; salary_max: number | null; salary_period: SalaryPeriod; salary_negotiable: boolean;
}) {
  const { salary_min: min, salary_max: max } = job;
  if (job.salary_negotiable || (min == null && max == null)) return "A combinar";
  const period = SALARY_PERIODS[job.salary_period];
  if (min != null && max != null && Number(min) !== Number(max)) return `${formatBRL(min)} – ${formatBRL(max)} ${period}`;
  return `${formatBRL(min ?? max)} ${period}`;
}

export function daysAgo(d: string | Date) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "Publicada hoje";
  if (days === 1) return "Publicada ontem";
  if (days < 30) return `Publicada há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Publicada há 1 mês" : `Publicada há ${months} meses`;
}

export const isNew = (d: string | Date | null) => !!d && Date.now() - new Date(d).getTime() < 3 * 86_400_000;

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "VL";
}

export function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const jobPath = (j: { city_slug: string; slug: string }) => `/vagas/${j.city_slug}/${j.slug}`;
