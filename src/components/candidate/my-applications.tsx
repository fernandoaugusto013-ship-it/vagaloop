"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { candidateStageLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export type StatusRow = {
  application_id: string; job_id: string; job_title: string; job_slug: string; job_city_slug: string; company_label: string;
  stage_name: string; stage_kind: string; stage_position: number; stage_count: number; updated_at: string; created_at: string;
};

/** Status em tempo real: assina application_status (tabela sem colunas internas da empresa). */
export function MyApplications({ initial, userId }: { initial: StatusRow[]; userId: string }) {
  const [rows, setRows] = useState(initial);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const ch = supabase.channel(`status-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "application_status", filter: `candidate_id=eq.${userId}` }, (payload) => {
        const row = payload.new as StatusRow;
        if (!row?.application_id) return;
        setRows((rs) => [row, ...rs.filter((r) => r.application_id !== row.application_id)]);
        setFlash(row.application_id);
        setTimeout(() => setFlash(null), 2500);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  return (
    <ul className="space-y-3" aria-live="polite">
      {rows.map((r) => {
        const closed = r.stage_kind === "reprovado";
        const hired = r.stage_kind === "contratado";
        const pct = closed ? 100 : Math.round(((r.stage_position + 1) / Math.max(1, r.stage_count)) * 100);
        return (
          <li key={r.application_id} className={cn("rounded-2xl border bg-surface p-5 transition-colors", flash === r.application_id ? "border-brand" : "border-line")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/vagas/${r.job_city_slug}/${r.job_slug}`} className="font-bold text-ink hover:text-brand">{r.job_title}</Link>
                <p className="text-sm text-muted">{r.company_label} · candidatura em {formatDate(r.created_at)}</p>
              </div>
              <Badge tone={hired ? "mint" : closed ? "neutral" : "brand"}>{candidateStageLabel(r.stage_kind, r.stage_name)}</Badge>
            </div>
            <div className="mt-4">
              <div className="h-2 rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso no processo">
                <div className={cn("h-full rounded-full transition-all duration-700", hired ? "bg-mint" : closed ? "bg-line" : "bg-brand")} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">Atualizado em {formatDate(r.updated_at)}{hired ? " · a empresa recebeu seu contato e vai falar com você" : ""}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
