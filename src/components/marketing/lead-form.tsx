"use client";
import { useActionState } from "react";
import Link from "next/link";
import { submitLead, type LeadState } from "@/app/actions/leads";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { COMPANY_SIZES, UFS } from "@/lib/constants";

export function LeadForm({ type }: { type: "contratar" | "recrutadora" }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, { ok: false, message: "" });
  if (state.ok) return <Notice tone="mint" title="Tudo certo">{state.message}</Notice>;
  const e = state.errors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input type="hidden" name="type" value={type} />
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {type === "contratar" ? (
        <>
          <Field label="Quantas contratações?" htmlFor="hires_count" error={e.hires_count}>
            <Select id="hires_count" name="hires_count" defaultValue="1"><option value="1">1 vaga</option><option value="2-5">2 a 5</option><option value="6-20">6 a 20</option><option value="20+">Mais de 20</option></Select>
          </Field>
          <Field label="Porte da empresa" htmlFor="company_size" error={e.company_size}>
            <Select id="company_size" name="company_size" defaultValue="">{[<option key="" value="">Selecione</option>, ...COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} pessoas</option>)]}</Select>
          </Field>
          <Field label="Empresa" htmlFor="company_name" className="sm:col-span-2"><Input id="company_name" name="company_name" autoComplete="organization" /></Field>
        </>
      ) : null}
      <Field label="Nome" htmlFor="name" error={e.name}><Input id="name" name="name" required autoComplete="name" aria-invalid={!!e.name} /></Field>
      <Field label="E-mail" htmlFor="email" error={e.email}><Input id="email" name="email" type="email" required autoComplete="email" aria-invalid={!!e.email} /></Field>
      <Field label="WhatsApp" htmlFor="whatsapp" error={e.whatsapp} className={type === "contratar" ? "sm:col-span-2" : ""}>
        <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" placeholder="(81) 99999-0000" autoComplete="tel" />
      </Field>
      {type === "recrutadora" ? (
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <Field label="Cidade" htmlFor="city"><Input id="city" name="city" autoComplete="address-level2" /></Field>
          <Field label="UF" htmlFor="uf"><Select id="uf" name="uf" defaultValue="">{[<option key="" value="">—</option>, ...UFS.map((u) => <option key={u}>{u}</option>)]}</Select></Field>
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Checkbox name="consent" label={<>Concordo com a <Link href="/privacidade" className="font-semibold text-brand underline">Política de Privacidade</Link> e com o contato da VagaLoop sobre este pedido.</>} />
        {e.consent ? <p className="mt-1 text-sm text-danger">{e.consent}</p> : null}
      </div>
      {state.message && !state.ok ? <p role="alert" className="text-sm text-danger sm:col-span-2">{state.message}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="sm:col-span-2">
        {pending ? "Enviando…" : type === "contratar" ? "Quero falar com uma especialista" : "Quero ser recrutadora VagaLoop"}
      </Button>
    </form>
  );
}
