import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = ["", "/vagas", "/quero-contratar", "/recrutadores", "/quem-somos", "/termos", "/privacidade",
    "/vagas/remoto", "/vagas?contrato=estagio", "/vagas?contrato=temporario"].map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now }));

  const supabase = await createPublicClient();
  if (!supabase) return pages;
  const [jobs, companies, cities] = await Promise.all([
    supabase.from("jobs_public").select("slug, city_slug, updated_at").order("published_at", { ascending: false }).limit(5000),
    supabase.from("companies_public").select("slug, open_jobs").gt("open_jobs", 0).limit(5000),
    supabase.rpc("top_job_cities", { max_rows: 50 }),
  ]);
  return [
    ...pages,
    ...(jobs.data ?? []).map((j) => ({ url: `${SITE_URL}/vagas/${j.city_slug}/${j.slug}`, lastModified: new Date(j.updated_at) })),
    ...(companies.data ?? []).map((c) => ({ url: `${SITE_URL}/empresas/${c.slug}` })),
    ...((cities.data ?? []) as { city_slug: string }[]).map((c) => ({ url: `${SITE_URL}/vagas/${c.city_slug}` })),
  ];
}
