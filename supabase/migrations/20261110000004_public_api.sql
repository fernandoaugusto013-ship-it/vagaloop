-- VagaLoop — Fase 1 · 04 · Leitura pública (visitantes e SEO)
-- As views rodam com os privilégios do dono (postgres) e expõem só colunas seguras.
-- Vaga confidencial: company_* vem NULL — nenhuma página, API ou metadado recebe o nome.

create or replace view public.jobs_public
with (security_barrier = true) as
select
  j.id, j.slug, j.city_slug, j.title, j.contract_type, j.work_mode, j.city, j.uf,
  j.salary_min, j.salary_max, j.salary_period, j.salary_negotiable,
  j.description, j.responsibilities, j.requirements, j.nice_to_have, j.benefits,
  j.workload, j.sector, j.seniority, j.positions, j.expires_at, j.published_at, j.updated_at,
  j.is_confidential, j.search,
  case when j.is_confidential then null else c.id          end as company_id,
  case when j.is_confidential then null else c.slug        end as company_slug,
  case when j.is_confidential then null else c.name        end as company_name,
  case when j.is_confidential then null else c.logo_url    end as company_logo_url,
  case when j.is_confidential then null else c.website     end as company_website,
  case when j.is_confidential then null else c.description end as company_about,
  case when j.is_confidential then false else c.is_verified end as company_verified
from public.jobs j
join public.companies c on c.id = j.company_id
where j.status = 'publicada'
  and j.published_at is not null
  and (j.expires_at is null or j.expires_at > now());

create or replace view public.companies_public
with (security_barrier = true) as
select c.id, c.slug, c.name, c.logo_url, c.website, c.description, c.culture, c.sector, c.size,
       c.city, c.uf, c.is_verified, c.created_at,
       (select count(*) from public.jobs j
         where j.company_id = c.id and j.status = 'publicada' and not j.is_confidential
           and (j.expires_at is null or j.expires_at > now()))::int as open_jobs
from public.companies c;

create or replace view public.settings_public as
select key, value from public.settings where is_public;

create or replace function public.platform_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'empresas',     (select count(*) from public.companies),
    'contratacoes', (select count(*) from public.applications where hired_at is not null),
    'vagas_abertas',(select count(*) from public.jobs
                      where status = 'publicada' and (expires_at is null or expires_at > now()))
  );
$$;

-- Atalhos de navegação (cidades com mais vagas)
create or replace function public.top_job_cities(max_rows int default 12)
returns table (city_slug text, city text, uf char(2), total bigint)
language sql stable security definer set search_path = '' as $$
  select city_slug, min(city), min(uf), count(*) from public.jobs
   where status = 'publicada' and city_slug <> 'remoto'
     and (expires_at is null or expires_at > now())
   group by city_slug order by count(*) desc, city_slug limit least(max_rows, 50);
$$;

revoke all on public.jobs_public, public.companies_public, public.settings_public from public;
grant select on public.jobs_public, public.companies_public, public.settings_public to anon, authenticated;
grant execute on function public.platform_stats(), public.top_job_cities(int) to anon, authenticated;
