-- VagaLoop — Fase 1 · 01 · Tabelas
-- Convenções: tudo em public; datas em timestamptz; valores comerciais vêm de public.settings.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------- tipos
create type public.user_role      as enum ('admin', 'company', 'recruiter', 'candidate');
create type public.company_role   as enum ('owner', 'member');
create type public.contract_type  as enum ('clt', 'pj', 'temporario', 'estagio', 'freelancer');
create type public.work_mode      as enum ('presencial', 'remoto', 'hibrido');
create type public.salary_period  as enum ('mensal', 'hora', 'bolsa');
create type public.job_status     as enum ('rascunho', 'publicada', 'pausada', 'encerrada', 'suspensa');
create type public.lead_type      as enum ('contratar', 'recrutadora');
create type public.lead_status    as enum ('novo', 'em_contato', 'qualificado', 'ganho', 'perdido');

-- ---------------------------------------------------------------- usuários
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'candidate',
  full_name   text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Um registro por usuário. O papel só muda por um admin (gatilho guard_profile_role).';

-- ---------------------------------------------------------------- empresas
create table public.companies (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  cnpj         text unique check (cnpj ~ '^[0-9]{14}$'),
  legal_name   text,
  name         text not null check (length(name) between 2 and 120),
  size         text check (size in ('1-10', '11-50', '51-200', '201-500', '500+')),
  sector       text,
  logo_url     text,
  website      text,
  description  text,
  culture      text,
  city         text,
  uf           char(2),
  is_verified  boolean not null default false,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.company_members (
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.company_role not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index on public.company_members (user_id);

create table public.company_invites (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  email        extensions.citext not null,
  role         public.company_role not null default 'member',
  token        uuid not null unique default gen_random_uuid(),
  invited_by   uuid references public.profiles (id) on delete set null,
  accepted_at  timestamptz,
  expires_at   timestamptz not null default now() + interval '14 days',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- recrutadoras (perfil mínimo; programa completo na Fase 3)
create table public.recruiter_profiles (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  bio         text,
  city        text,
  uf          char(2),
  sectors     text[] not null default '{}',
  cnpj        text,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- candidatos
create table public.candidate_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  headline            text,           -- objetivo profissional
  summary             text,
  city                text,
  uf                  char(2),
  salary_expectation  numeric(12, 2) check (salary_expectation >= 0),
  experiences         jsonb not null default '[]',  -- [{empresa, cargo, inicio, fim, descricao}]
  education           jsonb not null default '[]',  -- [{instituicao, curso, nivel, inicio, fim}]
  skills              text[] not null default '{}',
  languages           jsonb not null default '[]',  -- [{idioma, nivel}]
  links               jsonb not null default '[]',  -- [{rotulo, url}]  (sem contato pessoal)
  is_pcd              boolean not null default false,
  pcd_details         text,
  pref_work_modes     public.work_mode[] not null default '{}',
  pref_cities         text[] not null default '{}',
  pref_contracts      public.contract_type[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Contato fica separado: "Contato protegido até a contratação".
create table public.candidate_contacts (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  email         text,
  phone         text,
  whatsapp      text,
  linkedin_url  text,
  updated_at    timestamptz not null default now()
);

create table public.resumes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  mime_type     text not null check (mime_type in (
                  'application/pdf',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes    integer not null check (size_bytes between 1 and 5242880),
  parsed        jsonb,        -- campos estruturados SEM dados de contato
  parsed_at     timestamptz,
  is_primary    boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on public.resumes (user_id);

-- Registro de consentimento (LGPD)
create table public.consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,
  purpose     text not null,   -- ex.: 'termos', 'tratamento_dados_candidatura', 'alertas_vagas'
  version     text not null,
  granted     boolean not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index on public.consents (user_id);

-- ---------------------------------------------------------------- vagas
create table public.jobs (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  slug               text not null unique,
  city_slug          text not null,
  title              text not null check (length(title) between 3 and 140),
  contract_type      public.contract_type not null,
  work_mode          public.work_mode not null,
  city               text,
  uf                 char(2),
  salary_min         numeric(12, 2) check (salary_min >= 0),
  salary_max         numeric(12, 2) check (salary_max >= 0),
  salary_period      public.salary_period not null default 'mensal',
  salary_negotiable  boolean not null default false,   -- "a combinar"
  description        text not null default '',
  responsibilities   text[] not null default '{}',
  requirements       text[] not null default '{}',     -- obrigatórios
  nice_to_have       text[] not null default '{}',     -- diferenciais
  benefits           text[] not null default '{}',
  workload           text,                             -- jornada
  sector             text,
  seniority          text check (seniority in ('estagio', 'junior', 'pleno', 'senior', 'especialista', 'gestao')),
  is_confidential    boolean not null default false,
  is_managed         boolean not null default false,   -- serviço gerenciado (Fase 2)
  positions          integer not null default 1 check (positions between 1 and 500),
  expires_at         timestamptz,
  status             public.job_status not null default 'rascunho',
  published_at       timestamptz,
  created_by         uuid references public.profiles (id) on delete set null,
  created_via        text not null default 'manual' check (created_via in ('manual', 'lia')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  search             tsvector generated always as (
                       setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
                       setweight(to_tsvector('portuguese', coalesce(sector, '')), 'B') ||
                       setweight(to_tsvector('portuguese', coalesce(description, '')), 'C')
                     ) stored,
  check (salary_max is null or salary_min is null or salary_max >= salary_min),
  check (work_mode = 'remoto' or (city is not null and uf is not null))
);
create index jobs_company_idx on public.jobs (company_id);
create index jobs_public_idx  on public.jobs (status, published_at desc, id desc);
create index jobs_city_idx    on public.jobs (city_slug);
create index jobs_search_idx  on public.jobs using gin (search);

create table public.job_screening_questions (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references public.jobs (id) on delete cascade,
  position         integer not null default 0,
  question         text not null check (length(question) between 3 and 300),
  kind             text not null default 'yes_no' check (kind in ('yes_no', 'text', 'number', 'choice')),
  options          text[] not null default '{}',
  is_knockout      boolean not null default false,
  expected_answer  text,        -- para knockout: 'sim'/'nao', mínimo numérico ou opção
  created_at       timestamptz not null default now()
);
create index on public.job_screening_questions (job_id);

create table public.pipeline_stages (
  id               uuid primary key default gen_random_uuid(),
  job_id           uuid not null references public.jobs (id) on delete cascade,
  position         integer not null,
  name             text not null check (length(name) between 2 and 40),
  kind             text not null default 'custom' check (kind in (
                     'inscritos', 'triagem', 'teste', 'entrevista', 'finalistas',
                     'proposta', 'contratado', 'reprovado', 'custom')),
  notify_template  text,      -- chave em message_templates; null = sem e-mail ao candidato
  created_at       timestamptz not null default now(),
  unique (job_id, position) deferrable initially deferred
);
create index on public.pipeline_stages (job_id);

-- ---------------------------------------------------------------- candidaturas
create table public.applications (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid not null references public.jobs (id) on delete cascade,
  candidate_id        uuid references public.profiles (id) on delete cascade,
  external_candidate  jsonb,   -- adição manual pela empresa: {nome, email, telefone, resumo}
  stage_id            uuid references public.pipeline_stages (id) on delete set null,
  source              text not null default 'plataforma' check (source in ('plataforma', 'manual', 'indicacao')),
  answers             jsonb not null default '[]',   -- [{question_id, answer}]
  knockout_failed     boolean not null default false,
  cover_letter        text,
  match_score         smallint check (match_score between 0 and 100),
  ai_summary          jsonb,   -- {resumo, pontos_fortes[], lacunas[], alertas[]}
  ai_status           text not null default 'pendente' check (ai_status in ('pendente', 'ok', 'erro')),
  ai_scored_at        timestamptz,
  rating              smallint check (rating between 1 and 5),
  tags                text[] not null default '{}',
  hired_at            timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (candidate_id is not null or external_candidate is not null),
  unique (job_id, candidate_id)
);
create index on public.applications (job_id, match_score desc nulls last);
create index on public.applications (candidate_id);
create index on public.applications (stage_id);

-- O que o candidato pode ver da própria candidatura (sem nota interna, tags ou score).
-- Tabela separada para o Realtime não vazar colunas internas.
create table public.application_status (
  application_id  uuid primary key references public.applications (id) on delete cascade,
  candidate_id    uuid not null references public.profiles (id) on delete cascade,
  job_id          uuid not null references public.jobs (id) on delete cascade,
  job_title       text not null,
  job_slug        text not null,
  job_city_slug   text not null,
  company_label   text not null,   -- "Empresa confidencial" quando for o caso
  stage_name      text not null,
  stage_kind      text not null,
  stage_position  integer not null,
  stage_count     integer not null,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index on public.application_status (candidate_id);

create table public.application_events (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications (id) on delete cascade,
  actor_id        uuid references public.profiles (id) on delete set null,
  type            text not null check (type in ('criada', 'etapa', 'nota', 'avaliacao', 'ia', 'email', 'contato_liberado')),
  from_stage      uuid references public.pipeline_stages (id) on delete set null,
  to_stage        uuid references public.pipeline_stages (id) on delete set null,
  data            jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index on public.application_events (application_id, created_at desc);

create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications (id) on delete cascade,
  author_id       uuid references public.profiles (id) on delete set null,
  body            text not null check (length(body) between 1 and 4000),
  created_at      timestamptz not null default now()
);
create index on public.notes (application_id);

-- ---------------------------------------------------------------- comunicação
create table public.message_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references public.companies (id) on delete cascade,  -- null = padrão da plataforma
  key         text not null,
  subject     text not null,
  body        text not null,   -- texto com {{candidato}}, {{vaga}}, {{empresa}}, {{etapa}}, {{link}}
  updated_at  timestamptz not null default now()
);
create unique index message_templates_key_idx
  on public.message_templates (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

create table public.email_outbox (
  id            uuid primary key default gen_random_uuid(),
  to_user_id    uuid references public.profiles (id) on delete set null,
  to_email      text,
  template_key  text not null,
  subject       text not null,
  body          text not null,
  status        text not null default 'pendente' check (status in ('pendente', 'enviado', 'erro', 'sem_provedor')),
  attempts      integer not null default 0,
  error         text,
  related       jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create index on public.email_outbox (status, created_at);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------- comercial / admin
create table public.leads (
  id             uuid primary key default gen_random_uuid(),
  type           public.lead_type not null,
  name           text not null check (length(name) between 2 and 120),
  email          text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp       text,
  company_name   text,
  company_size   text,
  hires_count    text,
  city           text,
  uf             char(2),
  message        text,
  status         public.lead_status not null default 'novo',
  owner_id       uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.leads (type, status, created_at desc);

create table public.settings (
  key          text primary key,
  value        jsonb not null,
  label        text not null,
  is_public    boolean not null default false,
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

create table public.faqs (
  id            uuid primary key default gen_random_uuid(),
  scope         text not null check (scope in ('home', 'contratar', 'recrutadores', 'candidatos')),
  question      text not null,
  answer        text not null,
  position      integer not null default 0,
  is_published  boolean not null default true
);

-- Depoimentos e logos só aparecem quando cadastrados pelo admin (nada inventado).
create table public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  author_name   text not null,
  author_role   text,
  company       text,
  quote         text not null,
  avatar_url    text,
  scope         text not null default 'home' check (scope in ('home', 'contratar', 'recrutadores')),
  is_published  boolean not null default false,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.client_logos (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  logo_url      text not null,
  url           text,
  is_published  boolean not null default false,
  position      integer not null default 0
);

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on public.audit_logs (entity, entity_id);
