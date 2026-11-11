"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveJob } from "@/app/actions/jobs";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { CONTRACT_TYPES, SALARY_PERIODS, SECTORS, SENIORITIES, UFS, WORK_MODES } from "@/lib/constants";
import type { JobDraft, PartialJobDraft } from "@/lib/job-schema";
import { cn } from "@/lib/cn";

type Q = JobDraft["screening_questions"][number];

export const emptyDraft = (): PartialJobDraft => ({
  salary_period: "mensal", salary_negotiable: false, positions: 1, is_confidential: false,
  responsibilities: [], requirements: [], nice_to_have: [], benefits: [], screening_questions: [],
});

const lines = (v?: string[]) => (v ?? []).join("\n");
const toLines = (s: string) => s.split("\n").map((l) => l.replace(/^[\s•\-*]+/, "").trim()).filter(Boolean);

/** Formulário da vaga — usado na criação manual, ao lado da Lia e na edição. */
export function JobForm({ draft, onChange, jobId, via, companyName, highlight = [] }: {
  draft: PartialJobDraft; onChange: (d: PartialJobDraft) => void; jobId?: string; via: "manual" | "lia";
  companyName: string; highlight?: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const set = <K extends keyof PartialJobDraft>(k: K, v: PartialJobDraft[K]) => onChange({ ...draft, [k]: v });
  const qs = draft.screening_questions ?? [];
  const setQ = (i: number, patch: Partial<Q>) => set("screening_questions", qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const leaksName = draft.is_confidential && companyName.length > 2 &&
    [draft.title, draft.description, ...(draft.responsibilities ?? []), ...(draft.benefits ?? [])].join(" ").toLowerCase().includes(companyName.toLowerCase());

  function submit(publish: boolean) {
    setMessage(null);
    start(async () => {
      const r = await saveJob({ id: jobId, draft: draft as JobDraft, publish, via });
      if (!r.ok) { setErrors(r.fieldErrors ?? {}); setMessage(r.error); return; }
      setErrors({});
      if (publish) router.push(`/empresa/vagas?publicada=${r.id}`);
      else { setMessage("Rascunho salvo."); if (!jobId) router.replace(`/empresa/vagas/${r.id}/editar`); }
    });
  }

  const hl = (k: string) => (highlight.includes(k) ? "ring-2 ring-amber/40 rounded-xl" : "");

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(true); }} className="space-y-6" noValidate>
      <Field label="Cargo / título da vaga" htmlFor="title" error={errors.title} className={hl("cargo")}>
        <Input id="title" value={draft.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Analista de Dados Pleno" required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Contrato" htmlFor="contract_type" error={errors.contract_type} className={hl("contrato")}>
          <Select id="contract_type" value={draft.contract_type ?? ""} onChange={(e) => set("contract_type", e.target.value as JobDraft["contract_type"])}>
            <option value="" disabled>Selecione</option>{Object.entries(CONTRACT_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Modalidade" htmlFor="work_mode" error={errors.work_mode} className={hl("modalidade")}>
          <Select id="work_mode" value={draft.work_mode ?? ""} onChange={(e) => set("work_mode", e.target.value as JobDraft["work_mode"])}>
            <option value="" disabled>Selecione</option>{Object.entries(WORK_MODES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Senioridade" htmlFor="seniority">
          <Select id="seniority" value={draft.seniority ?? ""} onChange={(e) => set("seniority", (e.target.value || null) as JobDraft["seniority"])}>
            <option value="">Não se aplica</option>{Object.entries(SENIORITIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
      </div>

      <div className={cn("grid grid-cols-[1fr_100px] gap-4", hl("local"))}>
        <Field label={draft.work_mode === "remoto" ? "Cidade (opcional)" : "Cidade"} htmlFor="city" error={errors.city}>
          <Input id="city" value={draft.city ?? ""} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="UF" htmlFor="uf"><Select id="uf" value={draft.uf ?? ""} onChange={(e) => set("uf", (e.target.value || null) as JobDraft["uf"])}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
      </div>

      <fieldset className={cn("space-y-3", hl("salario"))}>
        <legend className="text-sm font-semibold">Salário</legend>
        <Checkbox label="A combinar" checked={!!draft.salary_negotiable} onChange={(e) => set("salary_negotiable", e.target.checked)} />
        {!draft.salary_negotiable ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Mínimo (R$)" htmlFor="salary_min"><Input id="salary_min" inputMode="numeric" value={draft.salary_min ?? ""} onChange={(e) => set("salary_min", e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")))} /></Field>
            <Field label="Máximo (R$)" htmlFor="salary_max" error={errors.salary_max}><Input id="salary_max" inputMode="numeric" value={draft.salary_max ?? ""} onChange={(e) => set("salary_max", e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")))} /></Field>
            <Field label="Período" htmlFor="salary_period"><Select id="salary_period" value={draft.salary_period ?? "mensal"} onChange={(e) => set("salary_period", e.target.value as JobDraft["salary_period"])}>{Object.entries(SALARY_PERIODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          </div>
        ) : null}
      </fieldset>

      <Field label="Descrição" htmlFor="description" hint="Contexto do time, desafios e o que a pessoa vai encontrar.">
        <Textarea id="description" rows={6} value={draft.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <ListField id="responsibilities" label="Responsabilidades" value={draft.responsibilities} onChange={(v) => set("responsibilities", v)} />
        <ListField id="requirements" label="Requisitos obrigatórios" value={draft.requirements} onChange={(v) => set("requirements", v)} className={hl("requisitos")} />
        <ListField id="nice_to_have" label="Diferenciais (desejáveis)" value={draft.nice_to_have} onChange={(v) => set("nice_to_have", v)} />
        <ListField id="benefits" label="Benefícios" value={draft.benefits} onChange={(v) => set("benefits", v)} className={hl("beneficios")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Jornada" htmlFor="workload" className={cn("sm:col-span-2", hl("jornada"))}><Input id="workload" value={draft.workload ?? ""} onChange={(e) => set("workload", e.target.value)} placeholder="Seg. a sex., 9h às 18h" /></Field>
        <Field label="Setor" htmlFor="sector"><Select id="sector" value={draft.sector ?? ""} onChange={(e) => set("sector", e.target.value || null)}><option value="">—</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</Select></Field>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Perguntas de triagem</legend>
        <p className="text-sm text-muted">Eliminatória = quem responder diferente do esperado fica marcado e com aderência limitada. A pessoa não é descartada automaticamente: você decide.</p>
        {qs.map((q, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-surface-2 p-3 sm:grid-cols-[1fr_140px]">
            <Input aria-label={`Pergunta ${i + 1}`} value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} placeholder="Ex.: Você tem CNH categoria B?" />
            <Select aria-label="Tipo de resposta" value={q.kind} onChange={(e) => setQ(i, { kind: e.target.value as Q["kind"], expected_answer: null })}>
              <option value="yes_no">Sim / Não</option><option value="number">Número</option><option value="text">Texto livre</option>
            </Select>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              {q.kind !== "text" ? <Checkbox label="Eliminatória" checked={q.is_knockout} onChange={(e) => setQ(i, { is_knockout: e.target.checked, expected_answer: e.target.checked ? (q.kind === "yes_no" ? "sim" : "1") : null })} /> : null}
              {q.is_knockout && q.kind === "yes_no" ? (
                <Select aria-label="Resposta esperada" className="h-9 w-32" value={q.expected_answer ?? "sim"} onChange={(e) => setQ(i, { expected_answer: e.target.value })}><option value="sim">Esperado: Sim</option><option value="nao">Esperado: Não</option></Select>
              ) : null}
              {q.is_knockout && q.kind === "number" ? (
                <label className="flex items-center gap-2 text-sm">Mínimo <Input className="h-9 w-24" inputMode="numeric" value={q.expected_answer ?? ""} onChange={(e) => setQ(i, { expected_answer: e.target.value.replace(/[^\d.,]/g, "") })} /></label>
              ) : null}
              <button type="button" onClick={() => set("screening_questions", qs.filter((_, j) => j !== i))} className="ml-auto text-sm font-semibold text-danger hover:underline">Remover</button>
            </div>
          </div>
        ))}
        {qs.length < 10 ? <Button type="button" variant="soft" size="sm" onClick={() => set("screening_questions", [...qs, { question: "", kind: "yes_no", options: [], is_knockout: false, expected_answer: null }])}>Adicionar pergunta</Button> : null}
      </fieldset>

      <fieldset className="grid gap-4 rounded-2xl border border-line p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold">Opções</legend>
        <div className="sm:col-span-3"><Checkbox label={<><strong>Vaga confidencial</strong>: o nome, logo e página da empresa não aparecem em nenhum lugar público.</>} checked={!!draft.is_confidential} onChange={(e) => set("is_confidential", e.target.checked)} /></div>
        <Field label="Nº de posições" htmlFor="positions"><Input id="positions" type="number" min={1} max={500} value={draft.positions ?? 1} onChange={(e) => set("positions", Number(e.target.value) || 1)} /></Field>
        <Field label="Inscrições até (opcional)" htmlFor="expires_at"><Input id="expires_at" type="date" value={draft.expires_at ?? ""} onChange={(e) => set("expires_at", e.target.value || null)} /></Field>
      </fieldset>

      {leaksName ? <Notice tone="amber" title="Atenção: vaga confidencial">O texto menciona “{companyName}”. Remova o nome para manter o sigilo.</Notice> : null}
      {message ? <p role="status" className={cn("text-sm", Object.keys(errors).length ? "text-danger" : "text-mint")}>{message}</p> : null}

      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Salvando…" : "Publicar vaga"}</Button>
        <Button type="button" size="lg" variant="secondary" disabled={pending} onClick={() => submit(false)}>Salvar rascunho</Button>
      </div>
    </form>
  );
}

function ListField({ id, label, value, onChange, className }: { id: string; label: string; value?: string[]; onChange: (v: string[]) => void; className?: string }) {
  const [text, setText] = useState(lines(value));
  const [last, setLast] = useState(value);
  if (value !== last) { setLast(value); if (toLines(text).join("\n") !== lines(value)) setText(lines(value)); }
  return (
    <Field label={label} htmlFor={id} hint="Um item por linha." className={className}>
      <Textarea id={id} rows={5} value={text} onChange={(e) => { setText(e.target.value); onChange(toLines(e.target.value)); }} />
    </Field>
  );
}
