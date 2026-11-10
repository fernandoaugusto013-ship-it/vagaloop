import type { Metadata } from "next";
import Link from "next/link";
import { JobFiltersForm } from "@/components/jobs/filters";
import { JobList } from "@/components/jobs/job-list";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { getTopCities, listJobs, parseFilters, type JobFilters } from "@/lib/public-data";
import { CONTRACT_TYPES, UF_NAMES, WORK_MODES } from "@/lib/constants";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function heading(f: JobFilters) {
  const parts = ["Vagas"];
  if (f.contrato) parts.push(f.contrato === "estagio" ? "de estágio" : `${CONTRACT_TYPES[f.contrato]}`);
  if (f.modalidade) parts.push(WORK_MODES[f.modalidade].toLowerCase() + "s");
  if (f.uf) parts.push(`em ${UF_NAMES[f.uf]}`);
  if (f.q) parts.push(`para “${f.q}”`);
  return parts.join(" ");
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = parseFilters(await searchParams);
  const title = heading(f);
  return {
    title,
    description: `${title} na VagaLoop. Candidate-se em poucos cliques e acompanhe cada etapa do processo.`,
    // páginas filtradas por texto livre ou cursor não entram no índice
    robots: f.q || f.cursor || f.salario || f.dias ? { index: false, follow: true } : undefined,
    alternates: { canonical: f.contrato || f.modalidade || f.uf ? undefined : "/vagas" },
  };
}

export default async function VagasPage({ searchParams }: Props) {
  const f = parseFilters(await searchParams);
  const [{ jobs, nextCursor }, cities] = await Promise.all([listJobs(f), getTopCities()]);
  const query = new URLSearchParams(Object.entries(f).filter(([k, v]) => v != null && k !== "cursor").map(([k, v]) => [k, String(v)])).toString();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{heading(f)}</h1>
      <p className="mt-2 text-muted">Mais recentes primeiro. Salário informado sempre que a empresa divulgou.</p>

      <nav aria-label="Atalhos" className="mt-6 flex flex-wrap gap-2">
        {[["/vagas?modalidade=remoto", "Remotas"], ["/vagas?modalidade=hibrido", "Híbridas"], ["/vagas?contrato=estagio", "Estágio"],
          ["/vagas?contrato=temporario", "Temporárias"], ["/vagas?contrato=clt", "CLT"], ["/vagas?contrato=pj", "PJ"]].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand">{label}</Link>
        ))}
        {cities.slice(0, 6).map((c) => (
          <Link key={c.city_slug} href={`/vagas/${c.city_slug}`} className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-semibold text-muted hover:text-brand">{c.city}/{c.uf}</Link>
        ))}
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="rounded-2xl border border-line bg-surface p-5 lg:open:block" open>
            <summary className="cursor-pointer text-sm font-bold lg:hidden">Filtros</summary>
            <div className="mt-4 lg:mt-0"><JobFiltersForm f={f} /></div>
          </details>
        </aside>
        <section aria-label="Resultados">
          {jobs.length ? (
            <JobList initial={jobs} nextCursor={nextCursor} query={query} />
          ) : (
            <EmptyState title="Nenhuma vaga com esses filtros" action={<ButtonLink href="/vagas" variant="secondary">Ver todas as vagas</ButtonLink>}>
              Tente remover algum filtro ou buscar por outro termo.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
