"use client";
import { useActionState } from "react";
import { inviteMember, type FormState } from "@/app/actions/company";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";

export function InviteForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(inviteMember, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
      <Field label="E-mail" htmlFor="invite-email" error={state.errors?.email}><Input id="invite-email" name="email" type="email" required placeholder="pessoa@empresa.com.br" /></Field>
      <Field label="Papel" htmlFor="invite-role"><Select id="invite-role" name="role" defaultValue="member"><option value="member">Membro</option><option value="owner">Administrador(a)</option></Select></Field>
      <Button type="submit" disabled={pending}>{pending ? "Enviando…" : "Convidar"}</Button>
      {state.error ? <p role="alert" className="text-sm text-danger sm:col-span-3">{state.error}</p> : null}
      {state.ok ? <Notice tone="mint" className="break-all sm:col-span-3">{state.message}</Notice> : null}
    </form>
  );
}
