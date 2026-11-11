-- VagaLoop — Fase 1 · 02 · Funções auxiliares e gatilhos
-- Funções de permissão são SECURITY DEFINER com search_path vazio, para uso dentro das políticas RLS
-- sem recursão. Nenhuma delas recebe dados do usuário além de IDs.

-- ---------------------------------------------------------------- utilitários
create or replace function public.slugify(value text)
returns text language sql stable set search_path = '' as $$
  select trim(both '-' from regexp_replace(
           lower(extensions.unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.is_privileged_role()
returns boolean language sql stable set search_path = '' as $$
  -- service_role (servidor) e postgres (migrações/SQL editor) passam pelas travas de papel.
  select current_user in ('postgres', 'service_role', 'supabase_admin');
$$;

create or replace function public.get_setting(setting_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select value from public.settings where key = setting_key;
$$;

-- ---------------------------------------------------------------- permissões (usadas no RLS)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_company_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.company_members where company_id = cid and user_id = auth.uid());
$$;

create or replace function public.is_company_owner(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.company_members
                 where company_id = cid and user_id = auth.uid() and role = 'owner');
$$;

create or replace function public.can_manage_job(jid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.jobs j
                 join public.company_members m on m.company_id = j.company_id
                 where j.id = jid and m.user_id = auth.uid());
$$;

create or replace function public.can_manage_application(aid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.applications a
                 join public.jobs j on j.id = a.job_id
                 join public.company_members m on m.company_id = j.company_id
                 where a.id = aid and m.user_id = auth.uid());
$$;

-- A empresa vê o perfil profissional de quem se candidatou às vagas dela.
create or replace function public.candidate_visible_to_me(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.applications a
                 join public.jobs j on j.id = a.job_id
                 join public.company_members m on m.company_id = j.company_id
                 where a.candidate_id = uid and m.user_id = auth.uid());
$$;

-- Contato (e-mail, telefone, CV original) só depois da contratação.
create or replace function public.contact_unlocked_for_me(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.applications a
                 join public.pipeline_stages s on s.id = a.stage_id
                 join public.jobs j on j.id = a.job_id
                 join public.company_members m on m.company_id = j.company_id
                 where a.candidate_id = uid and s.kind = 'contratado' and m.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------- novo usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  wanted text := new.raw_user_meta_data ->> 'role';
  r public.user_role;
begin
  -- Ninguém vira admin pelo cadastro.
  r := case when wanted in ('company', 'recruiter', 'candidate') then wanted::public.user_role
            else 'candidate' end;

  insert into public.profiles (id, role, full_name, avatar_url)
  values (new.id, r,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
          new.raw_user_meta_data ->> 'avatar_url');

  if r = 'candidate' then
    insert into public.candidate_profiles (user_id) values (new.id);
    insert into public.candidate_contacts (user_id, email) values (new.id, new.email);
  elsif r = 'recruiter' then
    insert into public.recruiter_profiles (user_id) values (new.id);
  end if;

  if (new.raw_user_meta_data ->> 'terms_version') is not null then
    insert into public.consents (user_id, purpose, version, granted)
    values (new.id, 'termos_e_privacidade', new.raw_user_meta_data ->> 'terms_version', true);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and not (public.is_admin() or public.is_privileged_role()) then
    raise exception 'Só um administrador pode alterar o papel de um usuário' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_profile_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------- empresas
create or replace function public.unique_company_slug(company_name text, cid uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare base text; candidate text; n int := 1;
begin
  base := coalesce(nullif(public.slugify(company_name), ''), 'empresa');
  candidate := base;
  while exists (select 1 from public.companies where slug = candidate and id <> cid) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end $$;

create or replace function public.companies_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.is_verified := case when public.is_privileged_role() or public.is_admin() then new.is_verified else false end;
  elsif new.is_verified is distinct from old.is_verified and not (public.is_admin() or public.is_privileged_role()) then
    raise exception 'Só um administrador pode verificar empresas' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' or new.slug is null or new.slug = '' then
    new.slug := public.unique_company_slug(new.name, new.id);
  end if;
  return new;
end $$;

create trigger companies_before_write before insert or update on public.companies
  for each row execute function public.companies_before_write();

create or replace function public.companies_add_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.company_members (company_id, user_id, role)
    values (new.id, new.created_by, 'owner') on conflict do nothing;
  end if;
  return new;
end $$;

create trigger companies_add_owner after insert on public.companies
  for each row execute function public.companies_add_owner();

create or replace function public.accept_company_invite(invite_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.company_invites;
begin
  select * into inv from public.company_invites
   where token = invite_token and accepted_at is null and expires_at > now();
  if not found then
    raise exception 'Convite inválido ou expirado';
  end if;
  if lower(inv.email::text) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Este convite foi enviado para outro e-mail';
  end if;
  insert into public.company_members (company_id, user_id, role)
  values (inv.company_id, auth.uid(), inv.role) on conflict do nothing;
  update public.company_invites set accepted_at = now() where id = inv.id;
  update public.profiles set role = 'company' where id = auth.uid() and role = 'candidate'
    and not exists (select 1 from public.applications where candidate_id = auth.uid());
  return inv.company_id;
end $$;

-- ---------------------------------------------------------------- vagas
create or replace function public.jobs_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    if new.slug is null or new.slug = '' then
      new.slug := left(public.slugify(new.title), 80) || '-' || left(replace(new.id::text, '-', ''), 6);
    end if;
    if new.status = 'suspensa' and not (public.is_admin() or public.is_privileged_role()) then
      raise exception 'Status inválido' using errcode = '42501';
    end if;
  else
    -- suspensão é moderação: só admin aplica ou retira
    if (new.status = 'suspensa' or old.status = 'suspensa') and new.status is distinct from old.status
       and not (public.is_admin() or public.is_privileged_role()) then
      raise exception 'Vaga suspensa pela moderação. Fale com o suporte.' using errcode = '42501';
    end if;
    if new.company_id <> old.company_id and not public.is_privileged_role() then
      raise exception 'Não é possível mover a vaga para outra empresa' using errcode = '42501';
    end if;
  end if;

  if new.work_mode = 'remoto' and (new.city is null or new.city = '') then
    new.city_slug := 'remoto';
  else
    new.city_slug := public.slugify(new.city) || '-' || lower(coalesce(new.uf, ''));
  end if;

  if new.status = 'publicada' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger jobs_before_write before insert or update on public.jobs
  for each row execute function public.jobs_before_write();

create or replace function public.jobs_default_stages()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.pipeline_stages (job_id, position, name, kind, notify_template) values
    (new.id, 0, 'Inscritos',         'inscritos',  'candidatura_recebida'),
    (new.id, 1, 'Triagem',           'triagem',    null),
    (new.id, 2, 'Teste técnico',     'teste',      'convite_teste'),
    (new.id, 3, 'Entrevista online', 'entrevista', 'convite_entrevista'),
    (new.id, 4, 'Finalistas',        'finalistas', null),
    (new.id, 5, 'Proposta',          'proposta',   null),
    (new.id, 6, 'Contratado',        'contratado', 'aprovacao'),
    (new.id, 7, 'Reprovado',         'reprovado',  'reprovacao');
  return new;
end $$;

create trigger jobs_default_stages after insert on public.jobs
  for each row execute function public.jobs_default_stages();

create or replace function public.company_label(j public.jobs)
returns text language sql stable security definer set search_path = '' as $$
  select case when j.is_confidential then 'Empresa confidencial'
              else (select name from public.companies where id = j.company_id) end;
$$;

create or replace function public.jobs_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.title is distinct from old.title or new.is_confidential is distinct from old.is_confidential
     or new.slug is distinct from old.slug or new.city_slug is distinct from old.city_slug then
    update public.application_status
       set job_title = new.title, job_slug = new.slug, job_city_slug = new.city_slug,
           company_label = public.company_label(new), updated_at = now()
     where job_id = new.id;
  end if;
  if new.status is distinct from old.status and (new.status = 'suspensa' or old.status = 'suspensa') then
    insert into public.audit_logs (actor_id, action, entity, entity_id, data)
    values (auth.uid(), 'moderacao_status', 'jobs', new.id::text,
            jsonb_build_object('de', old.status, 'para', new.status));
  end if;
  return new;
end $$;

create trigger jobs_after_update after update on public.jobs
  for each row execute function public.jobs_after_update();

-- ---------------------------------------------------------------- modelos de mensagem
create or replace function public.render_template(template_key text, cid uuid, vars jsonb)
returns table (subject text, body text)
language plpgsql stable security definer set search_path = '' as $$
declare t record; k text; v text;
begin
  select mt.subject, mt.body into t from public.message_templates mt
   where mt.key = template_key and (mt.company_id = cid or mt.company_id is null)
   order by mt.company_id nulls last limit 1;
  if not found then return; end if;
  subject := t.subject; body := t.body;
  for k, v in select * from jsonb_each_text(vars) loop
    subject := replace(subject, '{{' || k || '}}', coalesce(v, ''));
    body    := replace(body,    '{{' || k || '}}', coalesce(v, ''));
  end loop;
  return next;
end $$;

-- ---------------------------------------------------------------- candidaturas
create or replace function public.first_stage_of(jid uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.pipeline_stages where job_id = jid order by position limit 1;
$$;

create or replace function public.stage_belongs_to_job(sid uuid, jid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pipeline_stages where id = sid and job_id = jid);
$$;

-- knockout calculado no banco: o candidato não consegue marcar a si mesmo como aprovado
create or replace function public.knockout_failed(jid uuid, answers jsonb)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare failed boolean := false; q record; ans text;
begin
  for q in select id, kind, expected_answer from public.job_screening_questions
            where job_id = jid and is_knockout and expected_answer is not null loop
    select a ->> 'answer' into ans from jsonb_array_elements(coalesce(answers, '[]')) a
     where a ->> 'question_id' = q.id::text limit 1;
    if ans is null or trim(ans) = '' then
      failed := true;
    elsif q.kind = 'number' then
      failed := failed or ans !~ '^[0-9]+([.,][0-9]+)?$'
                       or replace(ans, ',', '.')::numeric < q.expected_answer::numeric;
    else
      failed := failed or lower(trim(ans)) <> lower(trim(q.expected_answer));
    end if;
  end loop;
  return failed;
end $$;

-- Gatilho SEM security definer: current_user precisa ser quem fez a escrita.
create or replace function public.applications_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.stage_id is null then
      new.stage_id := public.first_stage_of(new.job_id);
    end if;
    -- só quem respondeu pela plataforma passa pelo knockout; candidato adicionado pela empresa não respondeu nada
    new.knockout_failed := coalesce(new.source, 'plataforma') = 'plataforma' and new.candidate_id is not null
                           and public.knockout_failed(new.job_id, new.answers);
    -- campos que só a empresa/servidor definem
    if not public.is_privileged_role() and not public.can_manage_job(new.job_id) then
      new.match_score := null; new.ai_summary := null; new.ai_status := 'pendente';
      new.rating := null; new.tags := '{}'; new.source := 'plataforma'; new.hired_at := null;
    end if;
  else
    if new.job_id <> old.job_id or new.candidate_id is distinct from old.candidate_id then
      raise exception 'Candidatura não pode mudar de vaga ou candidato' using errcode = '42501';
    end if;
    if (new.match_score is distinct from old.match_score or new.ai_summary is distinct from old.ai_summary)
       and not public.is_privileged_role() then
      raise exception 'Score de IA é calculado pelo servidor' using errcode = '42501';
    end if;
  end if;

  if new.stage_id is not null and not public.stage_belongs_to_job(new.stage_id, new.job_id) then
    raise exception 'Etapa não pertence a esta vaga';
  end if;
  return new;
end $$;

create trigger applications_before_write before insert or update on public.applications
  for each row execute function public.applications_before_write();

create or replace function public.notify_stage_change(app public.applications, st public.pipeline_stages)
returns void language plpgsql security definer set search_path = '' as $$
declare
  j public.jobs;
  cname text;
  to_email text;
  cand_name text;
  site text := coalesce(public.get_setting('site_url') #>> '{}', '');
  msg record;
begin
  select * into j from public.jobs where id = app.job_id;
  cname := public.company_label(j);

  if app.candidate_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (app.candidate_id, 'etapa',
            case st.kind when 'reprovado' then 'Atualização na sua candidatura'
                         when 'contratado' then 'Parabéns! Você foi aprovado(a)'
                         else 'Sua candidatura avançou' end,
            j.title || ' · ' || cname,
            '/candidato');
    select c.email, p.full_name into to_email, cand_name
      from public.candidate_contacts c join public.profiles p on p.id = c.user_id
     where c.user_id = app.candidate_id;
  else
    to_email := app.external_candidate ->> 'email';
    cand_name := app.external_candidate ->> 'nome';
  end if;

  if st.notify_template is not null and to_email is not null then
    select * into msg from public.render_template(st.notify_template, j.company_id,
      jsonb_build_object('candidato', split_part(coalesce(cand_name, ''), ' ', 1), 'vaga', j.title,
                         'empresa', cname, 'etapa', st.name, 'link', site || '/candidato'));
    if msg.subject is not null then
      insert into public.email_outbox (to_user_id, to_email, template_key, subject, body, related)
      values (app.candidate_id, to_email, st.notify_template, msg.subject, msg.body,
              jsonb_build_object('application_id', app.id, 'stage_id', st.id));
    end if;
  end if;
end $$;

create or replace function public.applications_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare st public.pipeline_stages; j public.jobs; total int;
begin
  select * into st from public.pipeline_stages where id = new.stage_id;
  select * into j from public.jobs where id = new.job_id;
  select count(*) into total from public.pipeline_stages where job_id = new.job_id and kind <> 'reprovado';

  insert into public.application_events (application_id, actor_id, type, to_stage, data)
  values (new.id, auth.uid(), 'criada', new.stage_id, jsonb_build_object('source', new.source));

  if new.candidate_id is not null then
    insert into public.application_status
      (application_id, candidate_id, job_id, job_title, job_slug, job_city_slug, company_label,
       stage_name, stage_kind, stage_position, stage_count)
    values (new.id, new.candidate_id, j.id, j.title, j.slug, j.city_slug, public.company_label(j),
            st.name, st.kind, st.position, total);
    if new.source = 'plataforma' then
      perform public.notify_stage_change(new, st);
    end if;
  end if;

  -- avisa o time da empresa
  insert into public.notifications (user_id, type, title, body, link)
  select m.user_id, 'nova_candidatura', 'Nova candidatura', j.title, '/empresa/vagas/' || j.id || '/pipeline'
    from public.company_members m where m.company_id = j.company_id and m.user_id is distinct from auth.uid();
  return new;
end $$;

create trigger applications_after_insert after insert on public.applications
  for each row execute function public.applications_after_insert();

create or replace function public.applications_after_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare st public.pipeline_stages;
begin
  if new.stage_id is distinct from old.stage_id and new.stage_id is not null then
    select * into st from public.pipeline_stages where id = new.stage_id;

    insert into public.application_events (application_id, actor_id, type, from_stage, to_stage, data)
    values (new.id, auth.uid(), 'etapa', old.stage_id, new.stage_id, jsonb_build_object('etapa', st.name));

    update public.application_status
       set stage_name = st.name, stage_kind = st.kind, stage_position = st.position, updated_at = now()
     where application_id = new.id;

    if st.kind = 'contratado' then
      update public.applications set hired_at = coalesce(hired_at, now()) where id = new.id;
      insert into public.application_events (application_id, actor_id, type, data)
      values (new.id, auth.uid(), 'contato_liberado', '{}');
    end if;

    perform public.notify_stage_change(new, st);
  end if;

  if new.rating is distinct from old.rating then
    insert into public.application_events (application_id, actor_id, type, data)
    values (new.id, auth.uid(), 'avaliacao', jsonb_build_object('de', old.rating, 'para', new.rating));
  end if;

  if new.ai_status = 'ok' and old.ai_status is distinct from 'ok' then
    insert into public.application_events (application_id, actor_id, type, data)
    values (new.id, null, 'ia', jsonb_build_object('match_score', new.match_score));
  end if;
  return new;
end $$;

create trigger applications_after_update after update on public.applications
  for each row execute function public.applications_after_update();

create or replace function public.notes_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.application_events (application_id, actor_id, type, data)
  values (new.application_id, new.author_id, 'nota', jsonb_build_object('note_id', new.id));
  return new;
end $$;

create trigger notes_after_insert after insert on public.notes
  for each row execute function public.notes_after_insert();

create or replace function public.notes_before_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.author_id := coalesce(auth.uid(), new.author_id);
  return new;
end $$;

create trigger notes_before_insert before insert on public.notes
  for each row execute function public.notes_before_insert();

-- ---------------------------------------------------------------- etapas: não apagar etapa com candidatos
create or replace function public.stages_before_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.applications where stage_id = old.id) then
    raise exception 'Mova os candidatos desta etapa antes de removê-la';
  end if;
  if old.kind in ('inscritos', 'contratado', 'reprovado') then
    raise exception 'As etapas Inscritos, Contratado e Reprovado são obrigatórias';
  end if;
  return old;
end $$;

create trigger stages_before_delete before delete on public.pipeline_stages
  for each row execute function public.stages_before_delete();

-- ---------------------------------------------------------------- auditoria de configurações
create or replace function public.settings_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  insert into public.audit_logs (actor_id, action, entity, entity_id, data)
  values (auth.uid(), 'configuracao_alterada', 'settings', new.key,
          jsonb_build_object('de', old.value, 'para', new.value));
  return new;
end $$;

create trigger settings_audit before update on public.settings
  for each row execute function public.settings_audit();

-- ---------------------------------------------------------------- LGPD: exportar meus dados
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'gerado_em', now(),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'perfil_candidato', (select to_jsonb(c) from public.candidate_profiles c where c.user_id = auth.uid()),
    'contato', (select to_jsonb(c) from public.candidate_contacts c where c.user_id = auth.uid()),
    'curriculos', coalesce((select jsonb_agg(jsonb_build_object('arquivo', r.file_name, 'enviado_em', r.created_at, 'dados_extraidos', r.parsed))
                            from public.resumes r where r.user_id = auth.uid()), '[]'),
    'candidaturas', coalesce((select jsonb_agg(jsonb_build_object('vaga', s.job_title, 'empresa', s.company_label,
                               'etapa', s.stage_name, 'desde', s.created_at))
                              from public.application_status s where s.candidate_id = auth.uid()), '[]'),
    'consentimentos', coalesce((select jsonb_agg(to_jsonb(c)) from public.consents c where c.user_id = auth.uid()), '[]')
  );
$$;

-- ---------------------------------------------------------------- updated_at
create trigger set_updated_at before update on public.profiles           for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.companies          for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.recruiter_profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.candidate_profiles for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.candidate_contacts for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.jobs               for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.applications       for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.leads              for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.message_templates  for each row execute function public.set_updated_at();
