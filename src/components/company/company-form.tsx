"use client";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/company";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { COMPANY_SIZES, SECTORS, UFS } from "@/lib/constants";
import { formatCnpj } from "@/lib/cnpj";
import type { Company } from "@/lib/types";

export function CompanyForm({ action, company, submitLabel, withLogo = false }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; company?: Partial<Company>; submitLabel: string; withLogo?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [v, setV] = useState({ cnpj: company?.cnpj ? formatCnpj(company.cnpj) : "", name: company?.name ?? "", legal_name: company?.legal_name ?? "", city: company?.city ?? "", uf: company?.uf ?? "" });
  const [lookup, setLookup] = useState<"idle" | "loading" | "ok" | "fail">("idle");
  const e = state.errors ?? {};

  async function fetchCnpj() {
    const digits = v.cnpj.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setLookup("loading");
    const res = await fetch(`/api/cnpj/${digits}`);
    if (!res.ok) return setLookup("fail");
    const d = await res.json();
    setV((x) => ({ ...x, legal_name: d.legal_name || x.legal_name, name: x.name || d.trade_name || d.legal_name, city: d.city || x.city, uf: d.uf || x.uf }));
    setLookup("ok");
  }

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      <Field label="CNPJ" htmlFor="cnpj" error={e.cnpj} hint={lookup === "ok" ? "Dados preenchidos pela Receita. Confira." : lookup === "fail" ? "Não encontramos este CNPJ. Preencha à mão." : "Preenchemos razão social e endereço para você."}>
        <div className="flex gap-2">
          <Input id="cnpj" name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" value={v.cnpj}
            onChange={(ev) => setV({ ...v, cnpj: formatCnpj(ev.target.value) })} onBlur={fetchCnpj} aria-invalid={!!e.cnpj} />
          <Button type="button" variant="secondary" onClick={fetchCnpj} disabled={lookup === "loading"}>{lookup === "loading" ? "…" : "Buscar"}</Button>
        </div>
      </Field>
      <Field label="Razão social" htmlFor="legal_name"><Input id="legal_name" name="legal_name" value={v.legal_name} onChange={(ev) => setV({ ...v, legal_name: ev.target.value })} /></Field>
      <Field label="Nome da empresa (exibido nas vagas)" htmlFor="name" error={e.name}><Input id="name" name="name" required value={v.name} onChange={(ev) => setV({ ...v, name: ev.target.value })} aria-invalid={!!e.name} /></Field>
      <Field label="Site" htmlFor="website" error={e.website}><Input id="website" name="website" placeholder="www.suaempresa.com.br" defaultValue={company?.website ?? ""} /></Field>
      <Field label="Porte" htmlFor="size">
        <Select id="size" name="size" defaultValue={company?.size ?? ""}><option value="">Selecione</option>{COMPANY_SIZES.map((s) => <option key={s} value={s}>{s} pessoas</option>)}</Select>
      </Field>
      <Field label="Setor" htmlFor="sector">
        <Select id="sector" name="sector" defaultValue={company?.sector ?? ""}><option value="">Selecione</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</Select>
      </Field>
      <div className="grid grid-cols-[1fr_100px] gap-3 sm:col-span-2">
        <Field label="Cidade" htmlFor="city"><Input id="city" name="city" value={v.city} onChange={(ev) => setV({ ...v, city: ev.target.value })} /></Field>
        <Field label="UF" htmlFor="uf"><Select id="uf" name="uf" value={v.uf} onChange={(ev) => setV({ ...v, uf: ev.target.value })}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
      </div>
      <Field label="Sobre a empresa" htmlFor="description" className="sm:col-span-2" hint="Aparece na página pública e nas vagas não confidenciais.">
        <Textarea id="description" name="description" defaultValue={company?.description ?? ""} />
      </Field>
      <Field label="Cultura e jeito de trabalhar" htmlFor="culture" className="sm:col-span-2" hint="Ajuda a IA e as recrutadoras a avaliar fit cultural.">
        <Textarea id="culture" name="culture" defaultValue={company?.culture ?? ""} />
      </Field>
      {withLogo ? (
        <Field label="Logo" htmlFor="logo" error={e.logo} hint="PNG, JPG ou WebP, até 2 MB." className="sm:col-span-2">
          <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="py-2" />
        </Field>
      ) : null}
      {state.error ? <p role="alert" className="text-sm text-danger sm:col-span-2">{state.error}</p> : null}
      {state.ok && state.message ? <div className="sm:col-span-2"><Notice tone="mint">{state.message}</Notice></div> : null}
      <div className="sm:col-span-2"><Button type="submit" size="lg" disabled={pending}>{pending ? "Salvando…" : submitLabel}</Button></div>
    </form>
  );
}
