-- VagaLoop — Fase 1 · 06 · Embeddings (pgvector)
-- Dimensão 1536 (padrão da maioria dos modelos compatíveis com /v1/embeddings).
-- Se trocar de modelo, ajuste a dimensão antes de gravar vetores.

create extension if not exists vector with schema extensions;

alter table public.jobs               add column embedding extensions.vector(1536);
alter table public.candidate_profiles add column embedding extensions.vector(1536);

create index jobs_embedding_idx on public.jobs
  using hnsw (embedding extensions.vector_cosine_ops);
create index candidate_embedding_idx on public.candidate_profiles
  using hnsw (embedding extensions.vector_cosine_ops);

-- Similaridade de cosseno 0–1 entre candidato e vaga (usada como um dos sinais do match).
create or replace function public.embedding_similarity(job uuid, candidate uuid)
returns double precision language sql stable security definer set search_path = '' as $$
  select 1 - (j.embedding operator(extensions.<=>) c.embedding)
    from public.jobs j, public.candidate_profiles c
   where j.id = job and c.user_id = candidate
     and j.embedding is not null and c.embedding is not null;
$$;
revoke execute on function public.embedding_similarity(uuid, uuid) from public, anon, authenticated;
