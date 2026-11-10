"use client";
import { useActionState } from "react";
import { uploadResume, type UploadState } from "@/app/actions/candidate";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";

export function ResumeUpload({ current }: { current: { file_name: string; created_at: string } | null }) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadResume, {});
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="cv" className="block font-bold">Currículo</label>
      <p className="text-sm text-muted">{current ? `Atual: ${current.file_name}. Envie outro para atualizar.` : "Envie em PDF ou DOCX (até 5 MB). A IA lê e preenche seu perfil."}</p>
      <div className="flex flex-wrap items-center gap-3">
        <input id="cv" name="cv" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand-soft-ink" />
        <Button type="submit" disabled={pending}>{pending ? "Lendo currículo…" : "Enviar e preencher"}</Button>
      </div>
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state.ok ? <Notice tone="mint">{state.message}</Notice> : null}
    </form>
  );
}
