"use client";
import { useId, useState } from "react";
import { formatBRL } from "@/lib/format";

/** Simulador de ganhos: vagas/mês × ticket médio × % de repasse. Valores ilustrativos. */
export function EarningsSimulator({ splitPct, defaultTicket, monthlyFee }: { splitPct: number; defaultTicket: number; monthlyFee: number }) {
  const [jobs, setJobs] = useState(2);
  const [ticket, setTicket] = useState(defaultTicket);
  const id = useId();
  const share = (100 - splitPct) / 100;
  const monthly = jobs * ticket * share;
  const net = monthly - monthlyFee;
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
      <h2 className="text-xl font-bold">Simule seus ganhos</h2>
      <div className="mt-6 space-y-6">
        <div>
          <div className="flex justify-between text-sm"><label htmlFor={`${id}-j`} className="font-semibold">Vagas fechadas por mês</label><output htmlFor={`${id}-j`} className="font-bold text-brand">{jobs}</output></div>
          <input id={`${id}-j`} type="range" min={1} max={10} value={jobs} onChange={(e) => setJobs(Number(e.target.value))} className="mt-2 w-full accent-[var(--brand)]" />
        </div>
        <div>
          <div className="flex justify-between text-sm"><label htmlFor={`${id}-t`} className="font-semibold">Ticket médio por vaga</label><output htmlFor={`${id}-t`} className="font-bold text-brand">{formatBRL(ticket)}</output></div>
          <input id={`${id}-t`} type="range" min={1000} max={12000} step={250} value={ticket} onChange={(e) => setTicket(Number(e.target.value))} className="mt-2 w-full accent-[var(--brand)]" />
        </div>
        <p className="text-sm text-muted">Seu repasse: <strong className="text-ink">{100 - splitPct}%</strong> do valor de cada vaga fechada.</p>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3" aria-live="polite">
        <div className="rounded-xl bg-brand-soft p-4 text-brand-soft-ink"><dt className="text-sm">Por mês</dt><dd className="text-2xl font-extrabold">{formatBRL(monthly)}</dd></div>
        <div className="rounded-xl bg-surface-2 p-4"><dt className="text-sm text-muted">Por ano</dt><dd className="text-2xl font-extrabold">{formatBRL(monthly * 12)}</dd></div>
      </dl>
      <p className="mt-3 text-sm text-muted">Descontando a mensalidade de {formatBRL(monthlyFee)}: {formatBRL(net)} por mês.</p>
      <p className="mt-4 text-xs text-muted">Valores ilustrativos, sem garantia de ganho. O resultado depende das vagas que você fecha.</p>
    </div>
  );
}
