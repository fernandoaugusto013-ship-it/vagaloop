"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addNote, moveApplications, rescore, updateApplication } from "@/app/actions/jobs";
import { Select, Textarea, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function StageSelect({ id, stageId, stages }: { id: string; stageId: string | null; stages: { id: string; name: string }[] }) {
  const router = useRouter();
  const [value, setValue] = useState(stageId ?? "");
  const [pending, start] = useTransition();
  return (
    <div>
      <label htmlFor="stage" className="mb-1.5 block text-sm font-semibold">Etapa</label>
      <Select id="stage" value={value} disabled={pending} onChange={(e) => {
        const v = e.target.value; setValue(v);
        start(async () => { await moveApplications([id], v); router.refresh(); });
      }}>
        {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
    </div>
  );
}

export function RatingInput({ id, value }: { id: string; value: number | null }) {
  const [v, setV] = useState(value);
  const [, start] = useTransition();
  const set = (n: number | null) => { setV(n); start(() => { updateApplication(id, { rating: n }); }); };
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold">Sua avaliação</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => set(v === n ? null : n)} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} aria-pressed={v != null && n <= v}
            className={cn("text-2xl leading-none transition-colors", v != null && n <= v ? "text-amber" : "text-line hover:text-amber/60")}>★</button>
        ))}
      </div>
    </fieldset>
  );
}

export function TagsInput({ id, tags }: { id: string; tags: string[] }) {
  const [list, setList] = useState(tags);
  const [text, setText] = useState("");
  const [, start] = useTransition();
  const save = (next: string[]) => { setList(next); start(() => { updateApplication(id, { tags: next }); }); };
  return (
    <div>
      <label htmlFor="tag" className="mb-1.5 block text-sm font-semibold">Tags</label>
      <div className="flex flex-wrap gap-1.5">
        {list.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-soft-ink">
            {t}<button type="button" aria-label={`Remover tag ${t}`} onClick={() => save(list.filter((x) => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t && !list.includes(t) && list.length < 10) save([...list, t]); setText(""); }} className="mt-2">
        <Input id="tag" value={text} onChange={(e) => setText(e.target.value)} placeholder="Adicionar e Enter" maxLength={30} className="h-9" />
      </form>
    </div>
  );
}

export function NoteForm({ id }: { id: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; start(async () => { await addNote(id, text); setText(""); router.refresh(); }); }} className="space-y-2">
      <label htmlFor="note" className="sr-only">Nova nota interna</label>
      <Textarea id="note" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Nota interna (o candidato não vê)" />
      <Button type="submit" size="sm" disabled={pending || !text.trim()}>{pending ? "Salvando…" : "Adicionar nota"}</Button>
    </form>
  );
}

export function RescoreButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await rescore(id); router.refresh(); })}>
      {pending ? "Recalculando…" : "Recalcular"}
    </Button>
  );
}
