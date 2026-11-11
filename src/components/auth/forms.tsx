"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn, signInWithProvider, signUp, type AuthState } from "@/app/actions/auth";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export function SocialButtons({ voltar, perfil }: { voltar?: string; perfil?: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {([["google", "Continuar com Google"], ["linkedin_oidc", "Continuar com LinkedIn"]] as const).map(([p, label]) => (
        <form key={p} action={signInWithProvider}>
          <input type="hidden" name="provider" value={p} />
          {voltar ? <input type="hidden" name="voltar" value={voltar} /> : null}
          {perfil ? <input type="hidden" name="perfil" value={perfil} /> : null}
          <Button type="submit" variant="secondary" className="w-full">{label}</Button>
        </form>
      ))}
    </div>
  );
}

export function SignInForm({ voltar }: { voltar?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4">
      {voltar ? <input type="hidden" name="voltar" value={voltar} /> : null}
      <Field label="E-mail" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} /></Field>
      <Field label="Senha" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
    </form>
  );
}

const PERFIS = [
  { v: "company", label: "Empresa", d: "Quero publicar vagas" },
  { v: "candidate", label: "Candidato(a)", d: "Quero me candidatar" },
  { v: "recruiter", label: "Recrutadora", d: "Trabalho com R&S" },
] as const;

export function SignUpForm({ initialPerfil, voltar }: { initialPerfil: (typeof PERFIS)[number]["v"]; voltar?: string }) {
  const [perfil, setPerfil] = useState(initialPerfil);
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  if (state.info) return <Notice tone="mint" title="Quase lá">{state.info}</Notice>;
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Você é</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {PERFIS.map((p) => (
            <label key={p.v} className={cn("cursor-pointer rounded-xl border p-3 text-center transition-colors", perfil === p.v ? "border-brand bg-brand-soft text-brand-soft-ink" : "border-line hover:border-brand")}>
              <input type="radio" name="perfil-ui" value={p.v} checked={perfil === p.v} onChange={() => setPerfil(p.v)} className="sr-only" />
              <span className="block text-sm font-bold">{p.label}</span>
              <span className="mt-0.5 block text-xs opacity-80">{p.d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <SocialButtons voltar={voltar} perfil={perfil} />
      <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />ou com e-mail<span className="h-px flex-1 bg-line" /></div>
      <form action={action} className="space-y-4">
        <input type="hidden" name="perfil" value={perfil} />
        {voltar ? <input type="hidden" name="voltar" value={voltar} /> : null}
        <Field label="Nome completo" htmlFor="full_name"><Input id="full_name" name="full_name" autoComplete="name" required defaultValue={state.fields?.full_name} /></Field>
        <Field label={perfil === "company" ? "E-mail corporativo" : "E-mail"} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} /></Field>
        <Field label="Senha" htmlFor="password" hint="Pelo menos 8 caracteres."><Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></Field>
        <Checkbox name="terms" required label={<>Li e aceito os <Link href="/termos" target="_blank" className="font-semibold text-brand underline">Termos de uso</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold text-brand underline">Política de Privacidade</Link>.</>} />
        {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>{pending ? "Criando conta…" : "Criar conta grátis"}</Button>
      </form>
      <p className="text-xs text-muted">Ao continuar com Google ou LinkedIn, você também aceita os Termos de uso e a Política de Privacidade.</p>
    </div>
  );
}
