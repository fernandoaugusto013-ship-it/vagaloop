"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveApplications } from "@/app/actions/jobs";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { ScorePill, Stars } from "./score";
import type { PipelineCard, PipelineStage } from "./types";
import { cn } from "@/lib/cn";

export function PipelineBoard({ jobId, stages, cards: initial }: { jobId: string; stages: PipelineStage[]; cards: PipelineCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [stageFilter, setStageFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  useEffect(() => { setCards(initial); }, [initial]);

  // tempo real: novas candidaturas e scores calculados aparecem sem recarregar
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") {
      const t = setInterval(() => router.refresh(), 8000); // demo: sem Realtime, atualiza a cada 8 s
      return () => clearInterval(t);
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createBrowserSupabase();
    const ch = supabase.channel(`pipeline-${jobId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications", filter: `job_id=eq.${jobId}` }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId, router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return cards
      .filter((c) => !term || `${c.name} ${c.headline ?? ""} ${c.tags.join(" ")}`.toLowerCase().includes(term))
      .filter((c) => (c.match_score ?? 0) >= minScore)
      .filter((c) => !stageFilter || c.stage_id === stageFilter)
      .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
  }, [cards, q, minScore, stageFilter]);

  function move(ids: string[], stageId: string) {
    if (!ids.length) return;
    const before = cards;
    setCards((cs) => cs.map((c) => (ids.includes(c.id) ? { ...c, stage_id: stageId } : c)));
    setSelected(new Set());
    setError(null);
    start(async () => {
      const r = await moveApplications(ids, stageId);
      if (!r.ok) { setCards(before); setError(r.error); }
    });
  }

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-line bg-surface p-1" role="tablist" aria-label="Visualização">
          {(["kanban", "lista"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={cn("rounded-full px-4 py-1.5 text-sm font-semibold capitalize", view === v ? "bg-brand text-brand-ink" : "text-muted hover:text-ink")}>{v}</button>
          ))}
        </div>
        <Input aria-label="Buscar candidato" placeholder="Buscar por nome, cargo ou tag" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 w-full sm:w-64" />
        <Select aria-label="Aderência mínima" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="h-10 w-full sm:w-56">
          <option value={0}>Qualquer aderência</option><option value={50}>Aderência ≥ 50</option><option value={70}>Aderência ≥ 70</option><option value={80}>Aderência ≥ 80</option>
        </Select>
        {view === "lista" ? (
          <Select aria-label="Etapa" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="h-10 w-full sm:w-44">
            <option value="">Todas as etapas</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        ) : null}
        {selected.size ? (
          <div className="ml-auto flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm text-brand-soft-ink">
            <span className="font-semibold">{selected.size} selecionado(s)</span>
            <Select aria-label="Mover selecionados para" className="h-8 w-44 py-0" value="" onChange={(e) => move([...selected], e.target.value)}>
              <option value="" disabled>Mover para…</option>{stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <button onClick={() => setSelected(new Set())} className="font-semibold hover:underline">Limpar</button>
          </div>
        ) : null}
      </div>
      {error ? <Notice tone="danger" className="mb-4">{error}</Notice> : null}

      {view === "kanban" ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
          {stages.map((s) => {
            const col = filtered.filter((c) => c.stage_id === s.id);
            return (
              <section key={s.id} aria-label={s.name}
                onDragOver={(e) => { e.preventDefault(); setDragOver(s.id); }} onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData("text/plain"); const ids = selected.has(id) ? [...selected] : [id]; move(ids, s.id); }}
                className={cn("flex w-72 shrink-0 flex-col rounded-2xl bg-surface-2 p-2.5 transition-colors", dragOver === s.id && "ring-2 ring-brand")}>
                <header className="flex items-center justify-between px-1.5 pb-2 pt-1">
                  <h3 className={cn("text-sm font-bold", s.kind === "contratado" && "text-mint", s.kind === "reprovado" && "text-muted")}>{s.name}</h3>
                  <span className="rounded-full bg-surface px-2 text-xs font-semibold text-muted">{col.length}</span>
                </header>
                <ul className="flex min-h-24 flex-col gap-2">
                  {col.map((c) => (
                    <li key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                      className={cn("cursor-grab rounded-xl border bg-surface p-3 active:cursor-grabbing", selected.has(c.id) ? "border-brand" : "border-line")}>
                      <div className="flex items-start gap-2">
                        <input type="checkbox" aria-label={`Selecionar ${c.name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 accent-[var(--brand)]" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/empresa/candidaturas/${c.id}`} className="block truncate font-semibold text-ink hover:text-brand">{c.name}</Link>
                          {c.headline ? <p className="truncate text-xs text-muted">{c.headline}</p> : null}
                        </div>
                        <ScorePill score={c.match_score} status={c.ai_status} />
                      </div>
                      {c.ai_summary?.resumo ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{c.ai_summary.resumo}</p> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Stars value={c.rating} />
                        {c.knockout_failed ? <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[0.7rem] font-semibold text-danger">Eliminatória</span> : null}
                        {c.source === "manual" ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.7rem] font-semibold text-muted">Manual</span> : null}
                        {c.tags.slice(0, 2).map((t) => <span key={t} className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-semibold text-brand-soft-ink">{t}</span>)}
                      </div>
                      {/* alternativa acessível ao arrastar */}
                      <label className="sr-only" htmlFor={`mv-${c.id}`}>Mover {c.name} para</label>
                      <Select id={`mv-${c.id}`} value={c.stage_id ?? ""} onChange={(e) => move([c.id], e.target.value)} className="sr-only focus:not-sr-only focus:mt-2 focus:h-9">
                        {stages.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                      </Select>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="w-10 p-3"><input type="checkbox" aria-label="Selecionar todos" checked={selected.size > 0 && selected.size === filtered.length} onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((c) => c.id)) : new Set())} className="accent-[var(--brand)]" /></th>
                <th className="p-3 font-semibold">#</th><th className="p-3 font-semibold">Candidato</th><th className="p-3 font-semibold">Aderência</th><th className="p-3 font-semibold">Etapa</th><th className="p-3 font-semibold">Avaliação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((c, i) => (
                <tr key={c.id}>
                  <td className="p-3"><input type="checkbox" aria-label={`Selecionar ${c.name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-[var(--brand)]" /></td>
                  <td className="p-3 tabular-nums text-muted">{i + 1}</td>
                  <td className="p-3"><Link href={`/empresa/candidaturas/${c.id}`} className="font-semibold hover:text-brand">{c.name}</Link><p className="text-xs text-muted">{[c.headline, c.place].filter(Boolean).join(" · ")}</p></td>
                  <td className="p-3"><ScorePill score={c.match_score} status={c.ai_status} />{c.knockout_failed ? <span className="ml-2 text-xs font-semibold text-danger">eliminatória</span> : null}</td>
                  <td className="p-3">
                    <Select aria-label={`Etapa de ${c.name}`} value={c.stage_id ?? ""} onChange={(e) => move([c.id], e.target.value)} className="h-9 w-44 py-0">
                      {stages.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                    </Select>
                  </td>
                  <td className="p-3"><Stars value={c.rating} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <p className="p-6 text-center text-muted">Nenhum candidato com esses filtros.</p> : null}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">Arraste os cartões entre colunas, ou use Tab até o cartão para escolher a etapa pelo teclado. Selecione vários para mover em massa.</p>
    </div>
  );
}
