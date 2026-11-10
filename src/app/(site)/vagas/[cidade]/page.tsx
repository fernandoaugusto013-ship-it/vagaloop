import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobFiltersForm } from "@/components/jobs/filters";
import { JobList } from "@/components/jobs/job-list";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { listJobs, parseFilters } from "@/lib/public-data";

type Props = { params: Promise<{ cidade: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

function cityName(slug: string) {
  if (slug === "remoto") return "remotas";
  const m = slug.match(/^(.*)-([a-z]{2})$/);
  if (!m) return null;
  const city = m[1].split("-").map((w) => (["de", "da", "do", "das", "dos"].includes(w) ? w : w[0].toUpperCase() + w.slice(1))).join(" ");
  return `em ${city}/${m[2].toUpperCase()}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cidade } = await params;
  const name = cityName(cidade);
  return {
    title: `Vagas ${name ?? ""}`.trim(),
    description: `Vagas de emprego ${name ?? ""} na VagaLoop: salários informados, candidatura em poucos cliques.`,
    alternates: { canonical: `/vagas/${cidade}` },
  };
}

export default async function CidadePage({ params, searchParams }: Props) {
  const { cidade } = await params;
  const name = cityName(cidade);
  if (!name || !/^[a-z0-9-]{3,70}$/.test(cidade)) notFound();
  const f = { ...parseFilters(await searchParams), cidade: cidade === "remoto" ? undefined : cidade };
  if (cidade === "remoto") f.modalidade = "remoto";
  const { jobs, nextCursor } = await listJobs(f);
  const query = new URLSearchParams(Object.entries(f).filter(([k, v]) => v != null && k !== "cursor" && k !== "cidade").map(([k, v]) => [k, String(v)])).toString();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Vagas {name}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24 lg:self-start">
          <JobFiltersForm f={f} action={`/vagas/${cidade}`} hideCity />
        </aside>
        <section aria-label="Resultados">
          {jobs.length ? (
            <JobList initial={jobs} nextCursor={nextCursor} query={cidade === "remoto" ? query : `${query}${query ? "&" : ""}cidade=${cidade}`} basePath={`/vagas/${cidade}`} />
          ) : (
            <EmptyState title={`Ainda não há vagas abertas ${name}`} action={<ButtonLink href="/vagas" variant="secondary">Ver todas as vagas</ButtonLink>}>
              Crie seu perfil para receber vagas compatíveis assim que forem publicadas.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
