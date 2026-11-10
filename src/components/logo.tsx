import Link from "next/link";
import { cn } from "@/lib/cn";

/** Símbolo: um laço contínuo (empresa ↔ recrutadora ↔ candidato). */
export function LoopMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  const d = "M11 4.5a7.5 7.5 0 1 0 0 15c3.6 0 5.6-3.75 7.5-7.5s3.9-7.5 7.5-7.5a7.5 7.5 0 1 1 0 15c-3.6 0-5.6-3.75-7.5-7.5S14.6 4.5 11 4.5Z";
  return (
    <svg viewBox="0 0 37 24" fill="none" aria-hidden className={cn("h-6 w-auto", className)}>
      <path d={d} stroke="var(--brand)" strokeWidth="3.4" strokeLinecap="round" />
      {animated ? <path d={d} stroke="var(--mint)" strokeWidth="3.4" strokeLinecap="round" className="loop-trace" /> : null}
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-[1.3rem] font-extrabold tracking-tight text-ink", className)} aria-label="VagaLoop, página inicial">
      <LoopMark />
      <span>vaga<span className="text-brand">loop</span></span>
    </Link>
  );
}
