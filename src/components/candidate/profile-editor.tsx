"use client";
import { useState, useTransition } from "react";
import { saveProfile, type ProfileInput } from "@/app/actions/candidate";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { CONTRACT_TYPES, UFS, WORK_MODES } from "@/lib/constants";

type Exp = ProfileInput["experiences"][number];
type Edu = ProfileInput["education"][number];

export function ProfileEditor({ initial }: { initial: ProfileInput }) {
  const [p, setP] = useState(initial);
  const [skillsText, setSkillsText] = useState(initial.skills.join(", "));
  const [citiesText, setCitiesText] = useState(initial.pref_cities.join(", "));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setP({ ...p, [k]: v });
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: ProfileInput = {
      ...p,
      skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean),
      pref_cities: citiesText.split(",").map((s) => s.trim()).filter(Boolean),
      experiences: p.experiences.filter((x) => x.cargo || x.empresa),
      education: p.education.filter((x) => x.curso || x.instituicao),
      links: p.links.filter((l) => l.url),
      headline: p.headline || null, summary: p.summary || null, city: p.city || null, uf: p.uf || null,
      phone: p.phone || null, whatsapp: p.whatsapp || null, linkedin_url: p.linkedin_url || null, pcd_details: p.pcd_details || null,
    };
    start(async () => {
      const r = await saveProfile(payload);
      setMsg(r.ok ? { ok: true, text: "Perfil salvo." } : { ok: false, text: r.error });
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="full_name"><Input id="full_name" value={p.full_name} onChange={(e) => set("full_name", e.target.value)} required /></Field>
        <Field label="Objetivo / cargo" htmlFor="headline"><Input id="headline" value={p.headline ?? ""} onChange={(e) => set("headline", e.target.value)} placeholder="Ex.: Analista de Dados" /></Field>
        <Field label="Resumo profissional" htmlFor="summary" className="sm:col-span-2"><Textarea id="summary" rows={4} value={p.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></Field>
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <Field label="Cidade" htmlFor="city"><Input id="city" value={p.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="UF" htmlFor="uf"><Select id="uf" value={p.uf ?? ""} onChange={(e) => set("uf", (e.target.value || null) as ProfileInput["uf"])}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</Select></Field>
        </div>
        <Field label="Pretensão salarial mensal (R$)" htmlFor="salary"><Input id="salary" inputMode="numeric" value={p.salary_expectation ?? ""} onChange={(e) => set("salary_expectation", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)} /></Field>
        <Field label="Habilidades" htmlFor="skills" hint="Separe por vírgula." className="sm:col-span-2"><Input id="skills" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="SQL, Power BI, Excel avançado" /></Field>
      </section>

      <Repeater title="Experiências" items={p.experiences} empty={{ empresa: "", cargo: "", inicio: "", fim: "", descricao: "" }} onChange={(v) => set("experiences", v)}
        render={(x: Exp, upd) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input aria-label="Cargo" placeholder="Cargo" value={x.cargo} onChange={(e) => upd({ ...x, cargo: e.target.value })} />
            <Input aria-label="Empresa" placeholder="Empresa" value={x.empresa} onChange={(e) => upd({ ...x, empresa: e.target.value })} />
            <Input aria-label="Início" type="month" value={x.inicio ?? ""} onChange={(e) => upd({ ...x, inicio: e.target.value })} />
            <Input aria-label="Fim (vazio se atual)" type="month" value={x.fim ?? ""} onChange={(e) => upd({ ...x, fim: e.target.value })} />
            <Textarea aria-label="Descrição" placeholder="O que você fazia e resultados" rows={2} className="sm:col-span-2" value={x.descricao ?? ""} onChange={(e) => upd({ ...x, descricao: e.target.value })} />
          </div>
        )} />

      <Repeater title="Formação" items={p.education} empty={{ instituicao: "", curso: "", nivel: "" }} onChange={(v) => set("education", v)}
        render={(x: Edu, upd) => (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input aria-label="Curso" placeholder="Curso" value={x.curso} onChange={(e) => upd({ ...x, curso: e.target.value })} />
            <Input aria-label="Instituição" placeholder="Instituição" value={x.instituicao} onChange={(e) => upd({ ...x, instituicao: e.target.value })} />
            <Input aria-label="Nível" placeholder="Ex.: Graduação" value={x.nivel ?? ""} onChange={(e) => upd({ ...x, nivel: e.target.value })} />
          </div>
        )} />

      <Repeater title="Idiomas" items={p.languages} empty={{ idioma: "", nivel: "" }} onChange={(v) => set("languages", v)}
        render={(x, upd) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input aria-label="Idioma" placeholder="Idioma" value={x.idioma} onChange={(e) => upd({ ...x, idioma: e.target.value })} />
            <Select aria-label="Nível" value={x.nivel} onChange={(e) => upd({ ...x, nivel: e.target.value })}><option value="">Nível</option>{["Básico", "Intermediário", "Avançado", "Fluente", "Nativo"].map((n) => <option key={n}>{n}</option>)}</Select>
          </div>
        )} />

      <Repeater title="Links (portfólio, GitHub)" items={p.links} empty={{ rotulo: "", url: "" }} onChange={(v) => set("links", v)}
        render={(x, upd) => (
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <Input aria-label="Rótulo" placeholder="Portfólio" value={x.rotulo} onChange={(e) => upd({ ...x, rotulo: e.target.value })} />
            <Input aria-label="URL" type="url" placeholder="https://" value={x.url} onChange={(e) => upd({ ...x, url: e.target.value })} />
          </div>
        )} />

      <section className="space-y-4">
        <h2 className="font-bold">Preferências</h2>
        <fieldset><legend className="mb-2 text-sm font-semibold">Modalidades</legend><div className="flex flex-wrap gap-4">{Object.entries(WORK_MODES).map(([v, l]) => <Checkbox key={v} label={l} checked={p.pref_work_modes.includes(v as never)} onChange={() => set("pref_work_modes", toggle(p.pref_work_modes, v as ProfileInput["pref_work_modes"][number]))} />)}</div></fieldset>
        <fieldset><legend className="mb-2 text-sm font-semibold">Contratos</legend><div className="flex flex-wrap gap-4">{Object.entries(CONTRACT_TYPES).map(([v, l]) => <Checkbox key={v} label={l} checked={p.pref_contracts.includes(v as never)} onChange={() => set("pref_contracts", toggle(p.pref_contracts, v as ProfileInput["pref_contracts"][number]))} />)}</div></fieldset>
        <Field label="Cidades de interesse" htmlFor="cities" hint="Separe por vírgula."><Input id="cities" value={citiesText} onChange={(e) => setCitiesText(e.target.value)} /></Field>
      </section>

      <section className="space-y-3 rounded-2xl border border-line p-5">
        <h2 className="font-bold">Pessoa com deficiência (opcional)</h2>
        <p className="text-sm text-muted">Usado só para vagas afirmativas. Nunca entra no cálculo de aderência.</p>
        <Checkbox label="Sou PCD" checked={p.is_pcd} onChange={(e) => set("is_pcd", e.target.checked)} />
        {p.is_pcd ? <Input aria-label="Detalhes (opcional)" placeholder="Detalhes ou adaptações necessárias (opcional)" value={p.pcd_details ?? ""} onChange={(e) => set("pcd_details", e.target.value)} /> : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-line p-5">
        <div><h2 className="font-bold">Contato</h2><p className="text-sm text-muted">Protegido: as empresas só veem depois de contratar você.</p></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Telefone" htmlFor="phone"><Input id="phone" type="tel" value={p.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="WhatsApp" htmlFor="whatsapp"><Input id="whatsapp" type="tel" value={p.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="LinkedIn" htmlFor="linkedin"><Input id="linkedin" type="url" value={p.linkedin_url ?? ""} onChange={(e) => set("linkedin_url", e.target.value)} /></Field>
        </div>
      </section>

      {msg ? <Notice tone={msg.ok ? "mint" : "danger"}>{msg.text}</Notice> : null}
      <div className="sticky bottom-4"><Button type="submit" size="lg" disabled={pending} className="shadow-card">{pending ? "Salvando…" : "Salvar perfil"}</Button></div>
    </form>
  );
}

function Repeater<T>({ title, items, empty, onChange, render }: {
  title: string; items: T[]; empty: T; onChange: (v: T[]) => void; render: (item: T, update: (v: T) => void) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-bold">{title}</h2>
      {items.map((it, i) => (
        <div key={i} className="rounded-xl bg-surface-2 p-3">
          {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))))}
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="mt-2 text-sm font-semibold text-danger hover:underline">Remover</button>
        </div>
      ))}
      <Button type="button" variant="soft" size="sm" onClick={() => onChange([...items, { ...empty }])}>Adicionar</Button>
    </section>
  );
}
