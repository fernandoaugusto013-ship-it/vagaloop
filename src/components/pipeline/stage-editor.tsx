"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStage, removeStage, renameStage } from "@/app/actions/jobs";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { PipelineStage } from "./types";

const FIXED = ["inscritos", "contratado", "reprovado"];

export function StageEditor({ jobId, stages }: { jobId: string; stages: PipelineStage[] }) {
  const router = useRouter();
  const [names, setNames] = useState(Object.fromEntries(stages.map((s) => [s.id, s.name])));
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const beforeHired = stages.find((s) => s.kind === "contratado")?.position ?? stages.length;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => {
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.error ?? "Não foi possível salvar.");
    router.refresh();
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {stages.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <Input aria-label={`Nome da etapa ${s.name}`} value={names[s.id] ?? ""} onChange={(e) => setNames({ ...names, [s.id]: e.target.value })}
              onBlur={() => names[s.id] !== s.name && names[s.id]?.trim().length >= 2 && run(() => renameStage(s.id, names[s.id]))} className="h-10" />
            {!FIXED.includes(s.kind) ? (
              <button type="button" onClick={() => run(() => removeStage(s.id))} className="shrink-0 px-2 text-sm font-semibold text-danger hover:underline" disabled={pending}>Remover</button>
            ) : <span className="w-[72px] shrink-0 text-xs text-muted">fixa</span>}
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); if (newName.trim().length >= 2) { run(() => addStage(jobId, newName, beforeHired - 1)); setNewName(""); } }} className="flex gap-2">
        <Input aria-label="Nova etapa" placeholder="Nova etapa (entra antes de Contratado)" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-10" />
        <Button type="submit" size="sm" variant="soft" disabled={pending}>Adicionar</Button>
      </form>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
