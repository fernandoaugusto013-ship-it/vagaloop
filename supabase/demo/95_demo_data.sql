-- Dados FICTÍCIOS do modo demonstração (roda depois de supabase/seed.sql).
-- Pessoas, empresas e números inventados; nada aqui representa organizações reais.

-- O PGlite não tem pgvector: colunas de embedding viram texto só na demo.
alter table public.jobs add column if not exists embedding text;
alter table public.candidate_profiles add column if not exists embedding text;

do $$
declare
  emp_owner uuid := '00000000-0000-4000-a000-000000000002';
  co_mare   uuid := '00000000-0000-4000-b000-000000000001';
  co_brisa  uuid := '00000000-0000-4000-b000-000000000002';
  co_rota   uuid := '00000000-0000-4000-b000-000000000003';
  co_saude  uuid := '00000000-0000-4000-b000-000000000004';
  u_rafa    uuid := '00000000-0000-4000-a000-000000000010';
  u_luiza   uuid := '00000000-0000-4000-a000-000000000011';
  u_rec     uuid := '00000000-0000-4000-a000-000000000012';
  r record;
  j record;
  v_stage uuid;
begin
  -- usuários extras: dono(a) de outras empresas e uma recrutadora
  for r in select * from (values
      (u_rafa,  'rafael@brisa.dev',       'company',   'Rafael Nunes'),
      (u_luiza, 'luiza@rotasul.dev',      'company',   'Luiza Freitas'),
      (u_rec,   'recrutadora@vagaloop.dev','recruiter', 'Camila Prado')) as t(id, email, role, name)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data,
                            raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated', r.email,
            extensions.crypt('demo12345', extensions.gen_salt('bf')), now(), '{"provider":"email"}',
            jsonb_build_object('role', r.role, 'full_name', r.name, 'terms_version', '2026-11'), now(), now(), '', '', '', '')
    on conflict (id) do nothing;
  end loop;

  insert into public.companies (id, name, legal_name, size, sector, city, uf, description, culture, created_by, is_verified) values
    (co_brisa, 'Brisa Varejo', 'Brisa Comércio Varejista S.A.', '201-500', 'Varejo', 'Salvador', 'BA',
     'Rede de lojas de casa e decoração com 40 unidades no Nordeste.', 'Cliente no centro, metas claras e crescimento interno.', u_rafa, true),
    (co_rota, 'RotaSul Logística', 'RotaSul Transportes Ltda', '51-200', 'Logística', 'Curitiba', 'PR',
     'Transportadora regional com foco em entregas fracionadas no Sul.', 'Segurança em primeiro lugar e operação 24h bem organizada.', u_luiza, false),
    (co_saude, 'Clínica Vivace', 'Vivace Serviços Médicos Ltda', '11-50', 'Saúde', 'São Paulo', 'SP',
     'Clínica multidisciplinar de atenção primária.', 'Acolhimento, pontualidade e trabalho em equipe.', emp_owner, false)
  on conflict (id) do nothing;

  insert into public.jobs (company_id, title, contract_type, work_mode, city, uf, salary_min, salary_max, salary_period, salary_negotiable,
                           description, responsibilities, requirements, nice_to_have, benefits, workload, sector, seniority, status, created_via, published_at)
  values
    (co_brisa, 'Gerente de Loja', 'clt', 'presencial', 'Salvador', 'BA', 5500, 7000, 'mensal', false,
     'Liderar uma loja de grande porte, com time de 25 pessoas, garantindo metas de venda e boa experiência do cliente.',
     '{"Gerir equipe e escalas","Acompanhar metas diárias","Cuidar de estoque e exposição"}',
     '{"Experiência como gerente de loja","Gestão de equipes","Varejo"}', '{"Excel","Power BI"}',
     '{"Vale-refeição","Plano de saúde","Bônus por meta"}', 'Escala 6x1', 'Varejo', 'gestao', 'publicada', 'lia', now() - interval '2 days'),
    (co_brisa, 'Vendedor(a) Interno(a)', 'clt', 'presencial', 'Recife', 'PE', 1900, 2600, 'mensal', false,
     'Atendimento e vendas em loja, com comissão sobre resultado.', '{"Atender clientes","Fechar vendas","Organizar a loja"}',
     '{"Atendimento ao cliente","Vendas"}', '{"Experiência com decoração"}', '{"Comissão","Vale-transporte","Vale-refeição"}',
     'Escala 6x1', 'Varejo', 'junior', 'publicada', 'manual', now() - interval '1 day'),
    (co_brisa, 'Analista de E-commerce', 'clt', 'remoto', null, null, 4500, 6000, 'mensal', false,
     'Cuidar da operação do site: catálogo, campanhas e indicadores.', '{"Gerir catálogo","Analisar métricas","Rodar campanhas"}',
     '{"E-commerce","Google Analytics","Excel"}', '{"SEO","Google Ads"}', '{"Auxílio home office","Plano de saúde"}',
     'Segunda a sexta', 'Varejo', 'pleno', 'publicada', 'lia', now() - interval '5 days'),
    (co_rota, 'Motorista Carreteiro', 'clt', 'presencial', 'Curitiba', 'PR', 4200, 5000, 'mensal', false,
     'Rotas regionais no Sul com retorno semanal.', '{"Conduzir carreta","Conferir cargas","Registrar entregas"}',
     '{"CNH categoria E","Curso MOPP"}', '{"Experiência com rastreamento"}', '{"Diárias","Plano de saúde","Seguro de vida"}',
     'Escala por rota', 'Logística', null, 'publicada', 'manual', now() - interval '8 days'),
    (co_rota, 'Analista de Logística', 'clt', 'hibrido', 'Curitiba', 'PR', 3800, 4800, 'mensal', false,
     'Planejar rotas e acompanhar indicadores de entrega.', '{"Roteirizar entregas","Acompanhar SLA","Negociar com agregados"}',
     '{"Logística","Excel","Roteirização"}', '{"Power BI","SQL"}', '{"Vale-refeição","Plano de saúde"}',
     'Segunda a sexta, 8h às 17h', 'Logística', 'pleno', 'publicada', 'lia', now() - interval '3 days'),
    (co_rota, 'Auxiliar de Expedição (Temporário)', 'temporario', 'presencial', 'Joinville', 'SC', 1800, null, 'mensal', false,
     'Reforço de fim de ano na expedição.', '{"Separar pedidos","Conferir volumes"}', '{"Disponibilidade imediata"}', '{}',
     '{"Vale-transporte","Refeição no local"}', 'Turno da noite', 'Logística', null, 'publicada', 'manual', now() - interval '12 hours'),
    (co_saude, 'Enfermeiro(a) Assistencial', 'clt', 'presencial', 'São Paulo', 'SP', 5200, 6200, 'mensal', false,
     'Atendimento em atenção primária com equipe multidisciplinar.', '{"Triagem","Procedimentos de enfermagem","Educação em saúde"}',
     '{"Graduação em Enfermagem","COREN ativo"}', '{"Experiência em atenção primária"}', '{"Plano de saúde","Vale-refeição"}',
     'Segunda a sexta, 7h às 16h', 'Saúde', 'pleno', 'publicada', 'manual', now() - interval '6 days'),
    (co_saude, 'Recepcionista', 'clt', 'presencial', 'São Paulo', 'SP', null, null, 'mensal', true,
     'Recepção de pacientes e agendamentos.', '{"Agendar consultas","Atender pacientes"}', '{"Atendimento ao cliente","Pacote Office"}',
     '{}', '{"Vale-transporte","Vale-refeição"}', 'Segunda a sábado', 'Saúde', 'junior', 'publicada', 'manual', now() - interval '10 days'),
    (co_mare, 'Desenvolvedor(a) Front-end React', 'pj', 'remoto', null, null, 9000, 12000, 'mensal', false,
     'Construir os painéis que os clientes da Maré usam todo dia.', '{"Desenvolver telas em React","Escrever testes","Revisar código"}',
     '{"React","TypeScript","CSS"}', '{"Next.js","Testes automatizados"}', '{"Horário flexível","Equipamento"}',
     '40 horas semanais', 'Tecnologia', 'senior', 'publicada', 'lia', now() - interval '4 hours'),
    (co_mare, 'Estágio em Dados', 'estagio', 'hibrido', 'Recife', 'PE', 1400, null, 'bolsa', false,
     'Apoiar o time de dados com limpeza e visualização.', '{"Limpar bases","Montar gráficos"}', '{"Cursando Estatística, Computação ou Engenharia","Excel"}',
     '{"Python","SQL"}', '{"Bolsa-auxílio","Vale-transporte"}', '6 horas por dia', 'Tecnologia', 'estagio', 'rascunho', 'manual', null);

  -- candidatos fictícios
  for r in select * from (values
      ('00000000-0000-4000-d000-000000000001'::uuid, 'pedro.alves@exemplo.dev', 'Pedro Alves', 'Analista de BI', 'Recife', 'PE', 7200,
       '{SQL,"Power BI",Excel,Python}', '[{"empresa":"Distribuidora Exemplo","cargo":"Analista de BI","inicio":"2022-03","descricao":"Painéis financeiros em Power BI e consultas SQL."}]', '{hibrido}'),
      ('00000000-0000-4000-d000-000000000002', 'ana.ribeiro@exemplo.dev', 'Ana Ribeiro', 'Analista de Dados Júnior', 'Olinda', 'PE', 5000,
       '{SQL,Excel,"Google Sheets"}', '[{"empresa":"Startup Exemplo","cargo":"Assistente de Dados","inicio":"2024-01","descricao":"Relatórios semanais e limpeza de planilhas."}]', '{hibrido,presencial}'),
      ('00000000-0000-4000-d000-000000000003', 'bruno.tavares@exemplo.dev', 'Bruno Tavares', 'Cientista de Dados', 'São Paulo', 'SP', 14000,
       '{Python,SQL,"Machine Learning","Power BI"}', '[{"empresa":"Banco Exemplo","cargo":"Cientista de Dados","inicio":"2020-05","descricao":"Modelos de risco e painéis executivos."}]', '{remoto}'),
      ('00000000-0000-4000-d000-000000000004', 'carla.mendes@exemplo.dev', 'Carla Mendes', 'Gerente de Loja', 'Salvador', 'BA', 6500,
       '{Vendas,Liderança,Excel,"Atendimento ao cliente"}', '[{"empresa":"Loja Exemplo","cargo":"Gerente de Loja","inicio":"2019-02","descricao":"Gestão de 20 pessoas, meta batida 10 meses seguidos."}]', '{presencial}'),
      ('00000000-0000-4000-d000-000000000005', 'diego.souza@exemplo.dev', 'Diego Souza', 'Desenvolvedor Front-end', 'Fortaleza', 'CE', 11000,
       '{React,TypeScript,CSS,Next.js}', '[{"empresa":"Agência Exemplo","cargo":"Desenvolvedor Front-end","inicio":"2021-07","descricao":"Aplicações React com testes."}]', '{remoto}'),
      ('00000000-0000-4000-d000-000000000006', 'elisa.moraes@exemplo.dev', 'Elisa Moraes', 'Analista de Logística', 'Curitiba', 'PR', 4500,
       '{Logística,Excel,Roteirização,"Power BI"}', '[{"empresa":"Transportes Exemplo","cargo":"Analista de Logística","inicio":"2021-09","descricao":"Roteirização e controle de SLA."}]', '{hibrido,presencial}'),
      ('00000000-0000-4000-d000-000000000007', 'fabio.lima@exemplo.dev', 'Fábio Lima', 'Vendedor', 'Recife', 'PE', 2400,
       '{Vendas,"Atendimento ao cliente",Negociação}', '[{"empresa":"Magazine Exemplo","cargo":"Vendedor","inicio":"2023-04","descricao":"Vendas em loja e pós-venda."}]', '{presencial}')
    ) as t(id, email, name, headline, city, uf, sal, skills, exps, modes)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data,
                            raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated', r.email,
            extensions.crypt('demo12345', extensions.gen_salt('bf')), now(), '{"provider":"email"}',
            jsonb_build_object('role', 'candidate', 'full_name', r.name, 'terms_version', '2026-11'), now(), now(), '', '', '', '')
    on conflict (id) do nothing;
    update public.candidate_profiles set headline = r.headline, city = r.city, uf = r.uf, salary_expectation = r.sal,
      skills = r.skills::text[], experiences = r.exps::jsonb, pref_work_modes = r.modes::public.work_mode[],
      summary = r.headline || ' com experiência prática na área.'
    where user_id = r.id;
  end loop;

  -- candidaturas (os gatilhos criam status, histórico, avisos e e-mails)
  for r in select * from (values
      ('Analista de Dados Pleno', '00000000-0000-4000-d000-000000000001'::uuid, 'sim', 'entrevista'),
      ('Analista de Dados Pleno', '00000000-0000-4000-d000-000000000002', 'sim', 'triagem'),
      ('Analista de Dados Pleno', '00000000-0000-4000-d000-000000000003', 'nao', 'inscritos'),
      ('Analista de Dados Pleno', '00000000-0000-4000-d000-000000000003', null, null),
      ('Analista de Dados Pleno', '00000000-0000-4000-a000-000000000003', 'sim', 'finalistas'),
      ('Analista de Dados Pleno', '00000000-0000-4000-d000-000000000007', 'sim', 'reprovado'),
      ('Desenvolvedor(a) Front-end React', '00000000-0000-4000-d000-000000000005', null, 'teste'),
      ('Desenvolvedor(a) Front-end React', '00000000-0000-4000-d000-000000000003', null, 'inscritos'),
      ('Gerente de Loja', '00000000-0000-4000-d000-000000000004', null, 'proposta'),
      ('Vendedor(a) Interno(a)', '00000000-0000-4000-d000-000000000007', null, 'contratado'),
      ('Analista de Logística', '00000000-0000-4000-d000-000000000006', null, 'entrevista'),
      ('Estágio em Marketing Digital', '00000000-0000-4000-a000-000000000003', null, 'inscritos')
    ) as t(job_title, cand, resposta, etapa)
  loop
    if r.etapa is null then continue; end if;
    select id into j from public.jobs where title = r.job_title limit 1;
    insert into public.applications (job_id, candidate_id, answers)
    select j.id, r.cand, coalesce((select jsonb_agg(jsonb_build_object('question_id', q.id, 'answer',
                                     case when q.kind = 'number' then '3' else r.resposta end))
                                   from public.job_screening_questions q where q.job_id = j.id and r.resposta is not null), '[]')
    on conflict do nothing;
    if r.etapa <> 'inscritos' then
      select s.id into v_stage from public.pipeline_stages s where s.job_id = j.id and s.kind = r.etapa;
      update public.applications set stage_id = v_stage, rating = case r.etapa when 'finalistas' then 5 when 'entrevista' then 4 else rating end
       where job_id = j.id and candidate_id = r.cand;
    end if;
  end loop;

  -- uma candidatura adicionada manualmente pela empresa e alguns leads
  select id into j from public.jobs where title = 'Analista de Dados Pleno' limit 1;
  insert into public.applications (job_id, source, external_candidate)
  values (j.id, 'manual', '{"nome":"Gabriela Rocha","email":"gabriela.rocha@exemplo.dev","resumo":"Analista de dados com SQL, Power BI e Excel avançado, 4 anos em varejo."}');
  insert into public.notes (application_id, author_id, body)
  select a.id, emp_owner, 'Boa conversa inicial; pedir case de painel de estoque.'
    from public.applications a where a.job_id = j.id and a.candidate_id = '00000000-0000-4000-d000-000000000001';

  insert into public.leads (type, name, email, whatsapp, company_name, company_size, hires_count) values
    ('contratar', 'Marcos Teixeira', 'marcos@exemplo.dev', '(71) 90000-0001', 'Indústria Exemplo', '51-200', '2-5');
  insert into public.leads (type, name, email, whatsapp, city, uf) values
    ('recrutadora', 'Patrícia Gomes', 'patricia@exemplo.dev', '(41) 90000-0002', 'Curitiba', 'PR');
end $$;
