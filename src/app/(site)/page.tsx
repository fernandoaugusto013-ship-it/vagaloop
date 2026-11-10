import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { LoopMark } from "@/components/logo";
import { Faq } from "@/components/marketing/faq";
import { LogoStrip, Testimonials } from "@/components/marketing/testimonials";
import { JobCard } from "@/components/jobs/job-card";
import { getClientLogos, getFaqs, getPublicSettings, getStats, getTestimonials, listJobs } from "@/lib/public-data";

export const revalidate = 300;

const STEPS = [
  { n: "1", t: "Descreva a vaga para a Lia", d: "Conte por texto o que você precisa. A assistente pergunta o que faltar e monta a vaga completa." },
  { n: "2", t: "Publique grátis", d: "Vaga no ar em minutos, com página otimizada para o Google e perguntas de triagem." },
  { n: "3", t: "Receba candidatos já ranqueados", d: "Cada candidatura chega com índice de aderência e os pontos fortes e lacunas explicados." },
  { n: "4", t: "Decida e contrate", d: "Mova os candidatos no pipeline. Se a vaga apertar, chame uma especialista do setor." },
];

export default async function Home() {
  const [stats, faqs, testimonials, logos, settings, recent] = await Promise.all([
    getStats(), getFaqs("home"), getTestimonials("home"), getClientLogos(), getPublicSettings(), listJobs({}, 4),
  ]);
  const showStats = stats && stats.vagas_abertas + stats.empresas + stats.contratacoes > 0;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] size-[620px] rounded-full bg-brand/10 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <Badge tone="brand" className="px-3 py-1 text-[0.8rem]"><LoopMark className="h-3.5" animated /> IA + gente de RH, no mesmo processo</Badge>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Contrate mais rápido com <span className="text-brand">IA</span> e <span className="text-brand">especialistas</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Publique vagas grátis, sem cartão. A triagem por IA ranqueia os candidatos e explica o porquê. Quando a vaga for difícil,
              uma recrutadora do seu setor entrega {settings.finalists_count} finalistas com parecer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/cadastro?perfil=empresa" size="lg">Publicar vaga grátis</ButtonLink>
              <ButtonLink href="/quero-contratar" size="lg" variant="secondary">Falar com uma especialista</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Procurando emprego? <Link href="/vagas" className="font-semibold text-brand hover:underline">Veja as vagas abertas</Link>.</p>
          </div>
          <HeroPreview />
        </div>
      </section>

      {showStats ? (
        <section aria-label="Números da plataforma" className="border-y border-line bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-line px-4 py-8 text-center sm:px-6">
            {[["Vagas abertas", stats.vagas_abertas], ["Empresas", stats.empresas], ["Contratações", stats.contratacoes]].map(([l, v]) => (
              <div key={l as string} className="px-2">
                <dt className="text-sm text-muted">{l}</dt>
                <dd className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{Number(v).toLocaleString("pt-BR")}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="mt-16"><LogoStrip items={logos} /></div>

      {/* COMO FUNCIONA */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Como funciona</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid size-9 place-items-center rounded-full bg-brand-soft font-extrabold text-brand-soft-ink">{s.n}</span>
              <h3 className="mt-4 font-bold">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* COMPARAÇÃO */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Faça você mesmo ou deixe com uma especialista</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-7">
            <Badge tone="mint">Grátis</Badge>
            <h3 className="mt-3 text-xl font-bold">Self-service</h3>
            <p className="mt-1 text-muted">Para quem tem time e tempo para conduzir o processo.</p>
            <ul className="mt-5 space-y-2.5 text-[0.95rem]">
              {["Vagas ilimitadas, sem cartão e sem mensalidade", "Criação de vaga conversando com a Lia", "Pipeline kanban com triagem e ranking por IA", "Página da vaga pronta para o Google for Jobs"].map((i) => <Check key={i}>{i}</Check>)}
            </ul>
            <ButtonLink href="/cadastro?perfil=empresa" className="mt-7" variant="secondary">Começar grátis</ButtonLink>
          </div>
          <div className="rounded-2xl border-2 border-brand bg-surface p-7 shadow-card">
            <Badge tone="brand">Pague só se contratar</Badge>
            <h3 className="mt-3 text-xl font-bold">Contrate com uma especialista</h3>
            <p className="mt-1 text-muted">Para vagas difíceis, urgentes ou fora da rotina do time.</p>
            <ul className="mt-5 space-y-2.5 text-[0.95rem]">
              {[`Recrutadora dedicada do setor da vaga`, "Hunting, triagem e entrevistas por ela", `${settings.finalists_count} finalistas com parecer estruturado`, `Garantia de reposição de ${settings.guarantee_days} dias`].map((i) => <Check key={i}>{i}</Check>)}
            </ul>
            <ButtonLink href="/quero-contratar" className="mt-7">Ver como funciona</ButtonLink>
          </div>
        </div>
      </section>

      {recent.jobs.length ? (
        <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Vagas recentes</h2>
            <Link href="/vagas" className="text-sm font-semibold text-brand hover:underline">Ver todas</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">{recent.jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
        </section>
      ) : null}

      <div className="mt-20"><Testimonials items={testimonials} /></div>

      {/* RECRUTADORAS */}
      <section className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-8 rounded-[1.75rem] bg-ink px-7 py-10 text-bg sm:px-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider opacity-70">Programa Recrutadora VagaLoop</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Você é de RH? Receba clientes e ferramentas de IA para fechar mais vagas.</h2>
            <p className="mt-3 opacity-80">Método, mentoria, comunidade e fluxo de processos vindos da plataforma.</p>
          </div>
          <div className="md:text-right"><ButtonLink href="/recrutadores" variant="secondary">Conhecer o programa</ButtonLink></div>
        </div>
      </section>

      <div className="mt-20"><Faq items={faqs} /></div>
    </>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-mint" fill="currentColor" aria-hidden><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" /></svg>
      <span>{children}</span>
    </li>
  );
}

/** Prévia ilustrativa do pipeline (dados fictícios, rotulados como exemplo). */
function HeroPreview() {
  const cols = [
    { t: "Triagem", cards: [["Perfil A", 91], ["Perfil B", 84]] },
    { t: "Entrevista", cards: [["Perfil C", 88]] },
    { t: "Finalistas", cards: [["Perfil D", 93]] },
  ] as const;
  return (
    <figure className="relative" aria-label="Exemplo ilustrativo do pipeline da VagaLoop">
      <div className="rounded-[1.75rem] border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Exemplo</p>
            <p className="font-bold">Analista de Dados Pleno</p>
          </div>
          <Badge tone="mint">32 candidatos</Badge>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {cols.map((c) => (
            <div key={c.t} className="rounded-xl bg-surface-2 p-2.5">
              <p className="mb-2 px-1 text-xs font-semibold text-muted">{c.t}</p>
              <div className="space-y-2">
                {c.cards.map(([name, score]) => (
                  <div key={name} className="rounded-lg border border-line bg-surface p-2.5">
                    <p className="text-[0.8rem] font-semibold">{name}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="h-1.5 flex-1 rounded-full bg-line"><span className="block h-full rounded-full bg-brand" style={{ width: `${score}%` }} /></span>
                      <span className="text-[0.7rem] font-bold text-brand">{score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-brand-soft p-3 text-sm text-brand-soft-ink">
          <p className="font-semibold">Por que 93?</p>
          <p className="mt-0.5">Atende 5 de 5 requisitos, tem SQL e Power BI e já atuou como analista. Lacuna: inglês não informado.</p>
        </div>
      </div>
      <figcaption className="sr-only">Ilustração com dados fictícios.</figcaption>
    </figure>
  );
}
