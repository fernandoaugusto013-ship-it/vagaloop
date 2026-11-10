-- VagaLoop — Fase 1 · 03 · Row Level Security
-- Regra geral: nada é público direto nas tabelas. Visitantes leem só pelas views de 04_public_api.
-- Isolamento multi-tenant: tudo que é da empresa passa por is_company_member / can_manage_*.

create or replace function public.shares_company_with_me(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.company_members a
                 join public.company_members b on b.company_id = a.company_id
                 where a.user_id = auth.uid() and b.user_id = uid);
$$;

create or replace function public.job_is_public(jid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.jobs
                 where id = jid and status = 'publicada'
                   and (expires_at is null or expires_at > now()));
$$;

alter table public.profiles                enable row level security;
alter table public.companies               enable row level security;
alter table public.company_members         enable row level security;
alter table public.company_invites         enable row level security;
alter table public.recruiter_profiles      enable row level security;
alter table public.candidate_profiles      enable row level security;
alter table public.candidate_contacts      enable row level security;
alter table public.resumes                 enable row level security;
alter table public.consents                enable row level security;
alter table public.jobs                    enable row level security;
alter table public.job_screening_questions enable row level security;
alter table public.pipeline_stages         enable row level security;
alter table public.applications            enable row level security;
alter table public.application_status      enable row level security;
alter table public.application_events      enable row level security;
alter table public.notes                   enable row level security;
alter table public.message_templates       enable row level security;
alter table public.email_outbox            enable row level security;
alter table public.notifications           enable row level security;
alter table public.leads                   enable row level security;
alter table public.settings                enable row level security;
alter table public.faqs                    enable row level security;
alter table public.testimonials            enable row level security;
alter table public.client_logos            enable row level security;
alter table public.audit_logs              enable row level security;

-- ---------------------------------------------------------------- profiles
create policy "perfil: ver o próprio, colegas, candidatos às minhas vagas" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.shares_company_with_me(id)
         or public.candidate_visible_to_me(id));
create policy "perfil: editar o próprio" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------- companies
create policy "empresa: membros e admin leem" on public.companies
  for select to authenticated
  using (public.is_company_member(id) or created_by = auth.uid() or public.is_admin());
create policy "empresa: usuário do tipo empresa cria" on public.companies
  for insert to authenticated
  with check (public.my_role() = 'company' and coalesce(created_by, auth.uid()) = auth.uid());
create policy "empresa: dono edita" on public.companies
  for update to authenticated
  using (public.is_company_owner(id) or public.is_admin())
  with check (public.is_company_owner(id) or public.is_admin());
create policy "empresa: admin remove" on public.companies
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- company_members / invites
create policy "membros: o time se vê" on public.company_members
  for select to authenticated using (public.is_company_member(company_id) or public.is_admin());
create policy "membros: dono adiciona" on public.company_members
  for insert to authenticated with check (public.is_company_owner(company_id) or public.is_admin());
create policy "membros: dono altera papel" on public.company_members
  for update to authenticated using (public.is_company_owner(company_id) or public.is_admin());
create policy "membros: dono remove ou a pessoa sai" on public.company_members
  for delete to authenticated
  using (public.is_company_owner(company_id) or user_id = auth.uid() or public.is_admin());

create policy "convites: dono gerencia" on public.company_invites
  for all to authenticated
  using (public.is_company_owner(company_id) or public.is_admin())
  with check (public.is_company_owner(company_id) or public.is_admin());

-- ---------------------------------------------------------------- recrutadoras
create policy "recrutadora: própria, pública ou admin" on public.recruiter_profiles
  for select to authenticated using (user_id = auth.uid() or is_public or public.is_admin());
create policy "recrutadora: editar a própria" on public.recruiter_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- candidatos
create policy "candidato: próprio, empresas onde se candidatou, admin" on public.candidate_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.candidate_visible_to_me(user_id));
create policy "candidato: editar o próprio" on public.candidate_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "contato: protegido até a contratação" on public.candidate_contacts
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.contact_unlocked_for_me(user_id));
create policy "contato: editar o próprio" on public.candidate_contacts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- O arquivo original do CV traz telefone e e-mail: segue a mesma regra do contato.
create policy "cv: dono, admin, ou empresa após contratação" on public.resumes
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.contact_unlocked_for_me(user_id));
create policy "cv: dono envia" on public.resumes
  for insert to authenticated with check (user_id = auth.uid());
create policy "cv: dono atualiza" on public.resumes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cv: dono apaga" on public.resumes
  for delete to authenticated using (user_id = auth.uid());

create policy "consentimento: ver os próprios" on public.consents
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "consentimento: registrar os próprios" on public.consents
  for insert to authenticated with check (user_id = auth.uid());

-- ---------------------------------------------------------------- vagas
create policy "vagas: time da empresa e admin" on public.jobs
  for select to authenticated using (public.is_company_member(company_id) or public.is_admin());
create policy "vagas: time da empresa cria" on public.jobs
  for insert to authenticated with check (public.is_company_member(company_id));
create policy "vagas: time da empresa edita" on public.jobs
  for update to authenticated
  using (public.is_company_member(company_id) or public.is_admin())
  with check (public.is_company_member(company_id) or public.is_admin());
create policy "vagas: dono ou admin apaga" on public.jobs
  for delete to authenticated using (public.is_company_owner(company_id) or public.is_admin());

create policy "perguntas: públicas quando a vaga está no ar" on public.job_screening_questions
  for select to anon, authenticated
  using (public.job_is_public(job_id) or public.can_manage_job(job_id) or public.is_admin());
create policy "perguntas: time da empresa gerencia" on public.job_screening_questions
  for all to authenticated
  using (public.can_manage_job(job_id)) with check (public.can_manage_job(job_id));

create policy "etapas: time da empresa" on public.pipeline_stages
  for all to authenticated
  using (public.can_manage_job(job_id) or public.is_admin())
  with check (public.can_manage_job(job_id));

-- ---------------------------------------------------------------- candidaturas
create policy "candidaturas: time da empresa e admin leem" on public.applications
  for select to authenticated using (public.can_manage_job(job_id) or public.is_admin());
create policy "candidaturas: candidato se candidata / empresa adiciona manual" on public.applications
  for insert to authenticated
  with check (
    (candidate_id = auth.uid() and external_candidate is null and public.my_role() = 'candidate'
       and public.job_is_public(job_id))
    or (candidate_id is null and external_candidate is not null and public.can_manage_job(job_id))
  );
create policy "candidaturas: time da empresa move e avalia" on public.applications
  for update to authenticated
  using (public.can_manage_job(job_id) or public.is_admin())
  with check (public.can_manage_job(job_id) or public.is_admin());
create policy "candidaturas: admin apaga" on public.applications
  for delete to authenticated using (public.is_admin());

create policy "status: candidato vê o próprio" on public.application_status
  for select to authenticated using (candidate_id = auth.uid());

create policy "histórico: time da empresa" on public.application_events
  for select to authenticated using (public.can_manage_application(application_id) or public.is_admin());

create policy "notas: time da empresa lê" on public.notes
  for select to authenticated using (public.can_manage_application(application_id) or public.is_admin());
create policy "notas: time da empresa escreve" on public.notes
  for insert to authenticated with check (public.can_manage_application(application_id));
create policy "notas: autor apaga" on public.notes
  for delete to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------- comunicação
create policy "modelos: padrão para todos, próprios da empresa" on public.message_templates
  for select to authenticated
  using (company_id is null or public.is_company_member(company_id) or public.is_admin());
create policy "modelos: dono da empresa ou admin edita" on public.message_templates
  for all to authenticated
  using ((company_id is not null and public.is_company_owner(company_id)) or public.is_admin())
  with check ((company_id is not null and public.is_company_owner(company_id)) or public.is_admin());

create policy "outbox: só admin" on public.email_outbox
  for select to authenticated using (public.is_admin());

create policy "notificações: as minhas" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notificações: marcar como lida" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notificações: apagar as minhas" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------- comercial / admin
create policy "leads: qualquer pessoa envia" on public.leads
  for insert to anon, authenticated with check (status = 'novo' and owner_id is null);
create policy "leads: admin lê" on public.leads
  for select to authenticated using (public.is_admin());
create policy "leads: admin atualiza" on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "config: públicas para todos" on public.settings
  for select to anon, authenticated using (is_public or public.is_admin());
create policy "config: admin altera" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "faq: publicado" on public.faqs
  for select to anon, authenticated using (is_published or public.is_admin());
create policy "faq: admin" on public.faqs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "depoimentos: publicado" on public.testimonials
  for select to anon, authenticated using (is_published or public.is_admin());
create policy "depoimentos: admin" on public.testimonials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "logos: publicado" on public.client_logos
  for select to anon, authenticated using (is_published or public.is_admin());
create policy "logos: admin" on public.client_logos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "auditoria: admin" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- tempo real
-- O candidato assina application_status (sem colunas internas); a empresa assina applications.
alter publication supabase_realtime add table public.application_status;
alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.notifications;
