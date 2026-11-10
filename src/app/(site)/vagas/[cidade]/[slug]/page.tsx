import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getJob } from "@/lib/public-data";
import { Avatar, Badge, Card, Notice } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { CONTRACT_TYPES, SENIORITIES, WORK_MODES } from "@/lib/constants";
import { daysAgo, formatDate, formatSalary, jobPath } from "@/lib/format";
import { SITE_URL } from "@/lib/env";
import type { PublicJob } from "@/lib/types";

type Props = { params: Promise<{ cidade: string; slug: string }> };

const companyOf = (j: PublicJob) => (j.is_confidential ? "Empresa confidencial" : j.company_name ?? "");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) return { title: "Vaga não encontrada", robots: { index: false } };
  const place = job.work_mode === "remoto" && !job.city ? "Remoto" : `${job.city}/${job.uf}`;
  const title = `${job.title} · ${companyOf(job)} · ${place}`;
  const description = `${CONTRACT_TYPES[job.contract_type]}, ${WORK_MODES[job.work_mode].toLowerCase()}, ${formatSalary(job)}. ${job.description.slice(0, 120)}`;
  return {
    title, description,
    alternates: { canonical: jobPath(job) },
    openGraph: { title, description, type: "article", url: jobPath(job) },
  };
}

const EMPLOYMENT: Record<string, string> = { clt: "FULL_TIME", pj: "CONTRACTOR", temporario: "TEMPORARY", estagio: "INTERN", freelancer: "CONTRACTOR" };

/** schema.org JobPosting (Google for Jobs). Vaga confidencial: sem nome, logo ou site da empresa. */
function jobPostingLd(j: PublicJob) {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: j.title,
    description: [j.description, ...j.responsibilities.map((r) => `• ${r}`), ...j.requirements.map((r) => `• ${r}`)].join("\n"),
    datePosted: j.published_at,
    employmentType: EMPLOYMENT[j.contract_type],
    directApply: true,
    identifier: { "@type": "PropertyValue", name: "VagaLoop", value: j.id },
    hiringOrganization: j.is_confidential
      ? { "@type": "Organization", name: "Empresa confidencial" }
      : { "@type": "Organization", name: j.company_name, ...(j.company_website ? { sameAs: j.company_website } : {}), ...(j.company_logo_url ? { logo: j.company_logo_url } : {}) },
    url: `${SITE_URL}${jobPath(j)}`,
  };
  if (j.expires_at) ld.validThrough = j.expires_at;
  if (j.work_mode === "remoto") {
    ld.jobLocationType = "TELECOMMUTE";
    ld.applicantLocationRequirements = { "@type": "Country", name: "BR" };
  }
  if (j.city) {
    ld.jobLocation = { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: j.city, addressRegion: j.uf, addressCountry: "BR" } };
  }
  if (!j.salary_negotiable && (j.salary_min || j.salary_max)) {
    ld.baseSalary = {
      "@type": "MonetaryAmount", currency: "BRL",
      value: { "@type": "QuantitativeValue", minValue: j.salary_min ?? j.salary_max, maxValue: j.salary_max ?? j.salary_min, unitText: j.salary_period === "hora" ? "HOUR" : "MONTH" },
    };
  }
  return JSON.stringify(ld).replace(/</g, "\\u003c");
}

export default async function VagaPage({ params }: Props) {
  const { cidade, slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();
  if (job.city_slug !== cidade) permanentRedirect(jobPath(job));

  const company = companyOf(job);
  const place = job.work_mode === "remoto" && !job.city ? "Brasil (remoto)" : `${job.city}/${job.uf}`;
  const applyHref = `/candidatar/${job.id}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPostingLd(job) }} />
      <nav aria-label="Trilha" className="text-sm text-muted">
        <Link href="/vagas" className="hover:text-brand">Vagas</Link>
        <span aria-hidden> / </span>
        <Link href={`/vagas/${job.city_slug}`} className="hover:text-brand">{place}</Link>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <article>
          <div className="flex items-start gap-4">
            <Avatar name={job.is_confidential ? "Confidencial" : company} src={job.is_confidential ? null : job.company_logo_url} size={64} />
            <div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{job.title}</h1>
              <p className="mt-1 text-muted">
                {!job.is_confidential && job.company_slug ? <Link href={`/empresas/${job.company_slug}`} className="font-semibold text-ink hover:text-brand">{company}</Link> : <span className="italic">{company}</span>}
                {job.company_verified ? <Badge tone="mint" className="ml-2">Empresa verificada</Badge> : null}
              </p>
            </div>
          </div>

          <ul className="mt-6 flex flex-wrap gap-2">
            <li><Badge tone="brand">{CONTRACT_TYPES[job.contract_type]}</Badge></li>
            <li><Badge tone="brand">{WORK_MODES[job.work_mode]}</Badge></li>
            {job.seniority ? <li><Badge>{SENIORITIES[job.seniority]}</Badge></li> : null}
            {job.sector ? <li><Badge>{job.sector}</Badge></li> : null}
            {job.positions > 1 ? <li><Badge>{job.positions} posições</Badge></li> : null}
          </ul>

          <div className="mt-8 space-y-8 text-[1.02rem] leading-relaxed">
            {job.description ? <Section title="Sobre a vaga"><div className="prose-vl whitespace-pre-line">{job.description}</div></Section> : null}
            <ListSection title="Responsabilidades" items={job.responsibilities} />
            <ListSection title="Requisitos" items={job.requirements} />
            <ListSection title="Diferenciais" items={job.nice_to_have} />
            <ListSection title="Benefícios" items={job.benefits} />
            {job.workload ? <Section title="Jornada"><p>{job.workload}</p></Section> : null}
            {!job.is_confidential && job.company_about ? <Section title={`Sobre a ${company}`}><p className="whitespace-pre-line text-muted">{job.company_about}</p></Section> : null}
          </div>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-4">
            <div>
              <p className="text-sm text-muted">Salário</p>
              <p className="text-xl font-bold">{formatSalary(job)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted">Local</dt><dd className="font-semibold">{place}</dd></div>
              <div><dt className="text-muted">Publicação</dt><dd className="font-semibold">{daysAgo(job.published_at).replace("Publicada ", "")}</dd></div>
              {job.expires_at ? <div className="col-span-2"><dt className="text-muted">Inscrições até</dt><dd className="font-semibold">{formatDate(job.expires_at)}</dd></div> : null}
            </dl>
            <ButtonLink href={applyHref} size="lg" className="w-full">Candidatar-se</ButtonLink>
            <p className="text-xs leading-relaxed text-muted">
              Em poucos cliques, com o seu perfil. Você acompanha cada etapa em tempo real.
            </p>
          </Card>
          <Notice tone="neutral" className="mt-4">
            Seu contato só é compartilhado com a empresa se você for contratado(a). Até lá, ela vê seu perfil profissional.
          </Notice>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5"><span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />{i}</li>
        ))}
      </ul>
    </Section>
  );
}
