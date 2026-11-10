"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyToJob } from "@/app/actions/candidate";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";

type Q = { id: string; question: string; kind: string; options: string[] };

export function ApplyForm({ jobId, questions }: { jobId: string; questions: Q[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cover, setCover] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const missing = questions.filter((q) => !answers[q.id]?.trim());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (missing.length) return setError("Responda todas as perguntas.");
    if (!consent) return setError("É preciso autorizar o uso dos seus dados nesta candidatura.");
    start(async () => {
      const r = await applyToJob({ job_id: jobId, answers: questions.map((q) => ({ question_id: q.id, answer: answers[q.id] })), cover_letter: cover, consent: true });
      if (!r.ok) return setError(r.error);
      router.push("/candidato?enviada=1");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {questions.map((q, i) => (
        <fieldset key={q.id} className="space-y-2">
          <legend className="font-semibold">{i + 1}. {q.question}</legend>
          {q.kind === "yes_no" ? (
            <div className="flex gap-3">
              {[["sim", "Sim"], ["nao", "Não"]].map(([v, l]) => (
                <label key={v} className={`cursor-pointer rounded-full border px-5 py-2 text-sm font-semibold ${answers[q.id] === v ? "border-brand bg-brand-soft text-brand-soft-ink" : "border-line"}`}>
                  <input type="radio" name={q.id} value={v} checked={answers[q.id] === v} onChange={() => setAnswers({ ...answers, [q.id]: v })} className="sr-only" />{l}
                </label>
              ))}
            </div>
          ) : q.kind === "number" ? (
            <Input inputMode="decimal" aria-label={q.question} className="w-40" value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value.replace(/[^\d.,]/g, "") })} />
          ) : (
            <Textarea aria-label={q.question} rows={3} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
          )}
        </fieldset>
      ))}
      <Field label="Mensagem para a empresa (opcional)" htmlFor="cover"><Textarea id="cover" rows={4} maxLength={3000} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Por que esta vaga combina com você?" /></Field>
      <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} label={<>Autorizo a VagaLoop a compartilhar meu <strong>perfil profissional</strong> e minhas respostas com a empresa desta vaga, e a calcular a aderência com apoio de IA. Meu e-mail e telefone só serão liberados se eu for contratado(a).</>} />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">{pending ? "Enviando…" : "Enviar candidatura"}</Button>
    </form>
  );
}
