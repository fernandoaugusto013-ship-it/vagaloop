-- VagaLoop — dados de DEMONSTRAÇÃO para ambiente local (supabase db reset).
-- NÃO rode em produção: cria usuários com senha conhecida.
-- Logins (senha demo12345): admin@vagaloop.dev · empresa@vagaloop.dev · candidata@vagaloop.dev

do $$
declare
  u_admin uuid := '00000000-0000-4000-a000-000000000001';
  u_emp   uuid := '00000000-0000-4000-a000-000000000002';
  u_cand  uuid := '00000000-0000-4000-a000-000000000003';
  c_id    uuid := '00000000-0000-4000-b000-000000000001';
  j1 uuid := '00000000-0000-4000-c000-000000000001';
  j2 uuid := '00000000-0000-4000-c000-000000000002';
  j3 uuid := '00000000-0000-4000-c000-000000000003';
  r record;
begin
  for r in select * from (values
      (u_admin, 'admin@vagaloop.dev',     'candidate', 'Admin VagaLoop'),
      (u_emp,   'empresa@vagaloop.dev',   'company',   'Marina Costa'),
      (u_cand,  'candidata@vagaloop.dev', 'candidate', 'Júlia Andrade')) as t(id, email, role, name)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated', r.email,
            extensions.crypt('demo12345', extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('role', r.role, 'full_name', r.name, 'terms_version', '2026-11'),
            now(), now(), '', '', '', '')
    on conflict (id) do nothing;
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), r.id, r.id::text, jsonb_build_object('sub', r.id::text, 'email', r.email), 'email', now(), now(), now())
    on conflict do nothing;
  end loop;

  update public.profiles set role = 'admin' where id = u_admin;

  insert into public.companies (id, name, legal_name, size, sector, city, uf, website, description, culture, created_by, is_verified)
  values (c_id, 'Maré Analytics', 'Maré Analytics Tecnologia Ltda', '51-200', 'Tecnologia', 'Recife', 'PE',
          'https://example.com', 'Consultoria de dados que ajuda redes de varejo do Nordeste a decidir melhor com seus próprios números.',
          'Times pequenos, autonomia, documentação antes de reunião e sexta-feira de estudo.', u_emp, true)
  on conflict (id) do nothing;

  insert into public.jobs (id, company_id, title, contract_type, work_mode, city, uf, salary_min, salary_max, salary_period,
                           description, responsibilities, requirements, nice_to_have, benefits, workload, sector, seniority,
                           status, created_by, created_via)
  values
    (j1, c_id, 'Analista de Dados Pleno', 'clt', 'hibrido', 'Recife', 'PE', 6000, 7500, 'mensal',
     'Você vai transformar dados de vendas e estoque em painéis e análises que os clientes usam toda semana.',
     '{"Construir e manter painéis em Power BI","Modelar dados em SQL","Apresentar análises para clientes"}',
     '{"SQL","Power BI","Excel avançado","2 anos como analista de dados"}',
     '{"Python","Experiência com varejo"}',
     '{"Vale-refeição","Plano de saúde","Auxílio home office","Dia de folga no aniversário"}',
     'Segunda a sexta, 9h às 18h, 2 dias no escritório', 'Tecnologia', 'pleno', 'publicada', u_emp, 'lia'),
    (j2, c_id, 'Estágio em Marketing Digital', 'estagio', 'remoto', null, null, 1500, null, 'bolsa',
     'Estágio para apoiar o time de marketing em conteúdo, redes sociais e campanhas.',
     '{"Produzir conteúdo para LinkedIn e Instagram","Acompanhar métricas de campanhas"}',
     '{"Cursando Marketing, Publicidade ou Comunicação","Boa escrita"}', '{"Canva","Google Analytics"}',
     '{"Bolsa-auxílio","Auxílio internet","Recesso remunerado"}', '6 horas por dia', 'Marketing e Comunicação', 'estagio',
     'publicada', u_emp, 'manual'),
    (j3, c_id, 'Gerente Comercial', 'clt', 'presencial', 'Recife', 'PE', null, null, 'mensal',
     'Liderar o time comercial e a expansão para novos estados.', '{"Gerir time de 6 vendedores","Definir metas e rituais"}',
     '{"5 anos em vendas B2B","Gestão de equipes"}', '{}', '{"Plano de saúde","Comissão"}', 'Horário comercial',
     'Tecnologia', 'gestao', 'publicada', u_emp, 'manual')
  on conflict (id) do nothing;
  update public.jobs set salary_negotiable = true, is_confidential = true where id = j3;

  insert into public.job_screening_questions (job_id, position, question, kind, is_knockout, expected_answer) values
    (j1, 0, 'Você tem disponibilidade para trabalhar em modelo híbrido em Recife/PE?', 'yes_no', true, 'sim'),
    (j1, 1, 'Quantos anos de experiência você tem com SQL?', 'number', false, null)
  on conflict do nothing;

  update public.candidate_profiles set
    headline = 'Analista de Dados', city = 'Recife', uf = 'PE', salary_expectation = 7000,
    summary = 'Analista com 3 anos em BI para varejo, foco em SQL e Power BI.',
    skills = '{SQL,"Power BI","Excel avançado",Python}',
    experiences = '[{"empresa":"Loja Exemplo","cargo":"Analista de Dados","inicio":"2023-01","descricao":"Painéis de vendas e estoque em Power BI; modelagem em SQL Server."}]',
    languages = '[{"idioma":"Inglês","nivel":"Intermediário"}]',
    pref_work_modes = '{hibrido,remoto}'
  where user_id = u_cand;
  update public.candidate_contacts set phone = '(81) 90000-0000' where user_id = u_cand;
end $$;
