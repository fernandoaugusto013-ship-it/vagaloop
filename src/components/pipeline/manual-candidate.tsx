"use client";
import { useActionState } from "react";
import { addManualCandidate, type ManualState } from "@/app/actions/jobs";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";

export function ManualCandidateForm({ jobId }: { jobId: string }) {
  const [state, action, pending] = useActionState<ManualState, FormData>(addManualCandidate, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="job_id" value={jobId} />
      <Field label="Nome" htmlFor="mc-nome"><Input id="mc-nome" name="nome" required /></Field>
      <Field label="E-mail (opcional)" htmlFor="mc-email"><Input id="mc-email" name="email" type="email" /></Field>
      <Field label="Resumo do perfil" htmlFor="mc-resumo" hint="Cole o currículo ou um resumo: a IA usa este texto para calcular a aderência." className="sm:col-span-2">
        <Textarea id="mc-resumo" name="resumo" rows={4} />
      </Field>
      {state.error ? <p role="alert" className="text-sm text-danger sm:col-span-2">{state.error}</p> : null}
      {state.ok ? <Notice tone="mint" className="sm:col-span-2">Candidato adicionado em Inscritos.</Notice> : null}
      <div className="sm:col-span-2"><Button type="submit" size="sm" disabled={pending}>{pending ? "Adicionando…" : "Adicionar candidato"}</Button></div>
    </form>
  );
}
