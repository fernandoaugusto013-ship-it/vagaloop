import { cn } from "@/lib/cn";

export function ScorePill({ score, status, className }: { score: number | null; status: string; className?: string }) {
  if (status !== "ok" || score == null) {
    return <span className={cn("rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted", className)}>{status === "erro" ? "IA: erro" : "Analisando…"}</span>;
  }
  const tone = score >= 75 ? "bg-mint-soft text-mint" : score >= 50 ? "bg-amber-soft text-amber" : "bg-surface-2 text-muted";
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", tone, className)} title="Índice de aderência (IA)">{score}</span>;
}

export function Stars({ value }: { value: number | null }) {
  if (!value) return null;
  return <span className="text-xs text-amber" aria-label={`${value} de 5 estrelas`}>{"★".repeat(value)}<span className="text-line">{"★".repeat(5 - value)}</span></span>;
}
