import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar, Badge, EmptyState } from "@/components/ui/misc";
import { JobCard } from "@/components/jobs/job-card";
import { getCompanyPublic } from "@/lib/public-data";
import { createPublicClient } from "@/lib/supabase/server";
import type { JobCardData } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCompanyPublic((await params).slug);
  if (!c) return { title: "Empresa não encontrada", robots: { index: false } };
  return { title: `Vagas na ${c.name}`, description: c.description?.slice(0, 155) ?? `Vagas abertas na ${c.name}.`, alternates: { canonical: `/empresas/${c.slug}` } };
}

export default async function EmpresaPage({ params }: Props) {
  const c = await getCompanyPublic((await params).slug);
  if (!c) notFound();
  const supabase = await createPublicClient();
  // company_id só é preenchido em vagas NÃO confidenciais, então confidenciais nunca aparecem aqui
  const { data } = supabase ? await supabase.from("jobs_public").select("*").eq("company_id", c.id).order("published_at", { ascending: false }).limit(50) : { data: [] };
  const jobs = (data ?? []) as JobCardData[];
  const ld = JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: c.name, ...(c.website ? { url: c.website } : {}), ...(c.logo_url ? { logo: c.logo_url } : {}) }).replace(/</g, "\\u003c");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <header className="flex items-start gap-5">
        <Avatar name={c.name} src={c.logo_url} size={80} />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{c.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
            {[c.sector, c.size ? `${c.size} pessoas` : null, c.city && c.uf ? `${c.city}/${c.uf}` : null].filter(Boolean).join(" · ")}
            {c.is_verified ? <Badge tone="mint">Verificada</Badge> : null}
          </p>
          {c.website ? <a href={c.website} rel="noopener nofollow" target="_blank" className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">Site da empresa</a> : null}
        </div>
      </header>
      {c.description ? <section className="mt-8"><h2 className="mb-2 text-lg font-bold">Sobre</h2><p className="whitespace-pre-line leading-relaxed text-muted">{c.description}</p></section> : null}
      {c.culture ? <section className="mt-6"><h2 className="mb-2 text-lg font-bold">Cultura</h2><p className="whitespace-pre-line leading-relaxed text-muted">{c.culture}</p></section> : null}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Vagas abertas ({jobs.length})</h2>
        {jobs.length ? <div className="grid gap-3">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div> : <EmptyState title="Sem vagas abertas no momento" />}
      </section>
    </div>
  );
}
