"use client";
import { useActionState } from "react";
import { saveSettings, type SettingsState } from "@/app/actions/admin";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";

type Row = { key: string; label: string; value: unknown; is_public: boolean };

export function SettingsForm({ rows }: { rows: Row[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  return (
    <form action={action} className="space-y-5">
      {rows.map((r) => (
        <Field key={r.key} label={r.label} htmlFor={r.key} hint={<><code className="text-xs">{r.key}</code>{r.is_public ? " · exibido no site" : " · interno"}</>}>
          {typeof r.value === "number" ? <Input id={r.key} name={r.key} inputMode="decimal" defaultValue={String(r.value)} className="max-w-48" />
            : typeof r.value === "string" ? <Input id={r.key} name={r.key} defaultValue={r.value} />
            : <Textarea id={r.key} name={r.key} rows={8} defaultValue={JSON.stringify(r.value, null, 2)} className="font-mono text-sm" />}
        </Field>
      ))}
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state.ok ? <Notice tone="mint">Configurações salvas. O site já usa os novos valores (sem deploy).</Notice> : null}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Salvando…" : "Salvar configurações"}</Button>
    </form>
  );
}
