-- VagaLoop — Fase 1 · 07 · Dados de referência (necessários em produção)
-- Valores comerciais ficam aqui e são editados no /admin — nunca no código.

insert into public.settings (key, value, label, is_public) values
  ('recruiter_monthly_fee',   '490',  'Mensalidade da recrutadora (R$)', true),
  ('recruiter_refund_days',   '7',    'Garantia da assinatura da recrutadora (dias)', true),
  ('platform_split_pct',      '50',   'Percentual retido pela plataforma por vaga fechada (%)', true),
  ('guarantee_days',          '30',   'Prazo da garantia de reposição (dias)', true),
  ('finalists_count',         '2',    'Número de finalistas entregues no serviço gerenciado', true),
  ('managed_ticket_reference','3500', 'Ticket médio de referência do serviço gerenciado (R$, simulador)', true),
  ('data_retention_months',   '24',   'Retenção de dados de candidatos inativos (meses)', true),
  ('terms_version',           '"2026-11"', 'Versão vigente dos Termos e da Política de Privacidade', true),
  ('dpo_contact',             '"privacidade@vagaloop.com.br"', 'Contato do encarregado (DPO)', true),
  ('site_url',                '"http://localhost:3000"', 'URL pública do site (links em e-mails)', false),
  ('pricing_table', '[
     {"nivel": "Operacional", "faixa_salarial": "até R$ 3.000", "valor": 1500},
     {"nivel": "Técnico / Júnior", "faixa_salarial": "R$ 3.000 a 6.000", "valor": 2900},
     {"nivel": "Pleno", "faixa_salarial": "R$ 6.000 a 10.000", "valor": 4500},
     {"nivel": "Sênior / Especialista", "faixa_salarial": "R$ 10.000 a 18.000", "valor": 7500},
     {"nivel": "Gestão", "faixa_salarial": "acima de R$ 18.000", "valor": 11000}
   ]', 'Tabela de preços do serviço gerenciado (por vaga)', true)
on conflict (key) do nothing;

insert into public.message_templates (company_id, key, subject, body) values
  (null, 'candidatura_recebida', 'Recebemos sua candidatura para {{vaga}}',
   'Olá, {{candidato}}!

Sua candidatura para {{vaga}} ({{empresa}}) foi recebida. Você acompanha cada etapa em {{link}}.

Boa sorte!
Equipe VagaLoop'),
  (null, 'convite_teste', '{{vaga}}: próxima etapa é um teste',
   'Olá, {{candidato}}!

Você avançou no processo de {{vaga}} ({{empresa}}). A próxima etapa é um teste. As instruções aparecem em {{link}}.

Equipe VagaLoop'),
  (null, 'convite_entrevista', '{{vaga}}: convite para entrevista',
   'Olá, {{candidato}}!

{{empresa}} quer conversar com você sobre a vaga {{vaga}}. Os detalhes do agendamento chegam em seguida; acompanhe em {{link}}.

Equipe VagaLoop'),
  (null, 'aprovacao', 'Você foi aprovado(a) para {{vaga}}',
   'Olá, {{candidato}}!

Ótima notícia: {{empresa}} aprovou você para {{vaga}}. A empresa vai entrar em contato com os próximos passos.

Equipe VagaLoop'),
  (null, 'reprovacao', 'Atualização sobre {{vaga}}',
   'Olá, {{candidato}}.

Agradecemos seu interesse em {{vaga}}. Desta vez o processo seguiu com outros perfis. Seu cadastro continua ativo e você recebe novas vagas compatíveis em {{link}}.

Equipe VagaLoop'),
  (null, 'convite_empresa', 'Você foi convidado(a) para o time {{empresa}} na VagaLoop',
   'Olá!

Você recebeu um convite para entrar no time {{empresa}} na VagaLoop. Para aceitar, acesse: {{link}}

O convite vale por 14 dias.')
on conflict do nothing;

insert into public.faqs (scope, position, question, answer) values
  ('home', 0, 'Publicar vagas é gratuito mesmo?',
   'Sim. A empresa publica vagas ilimitadas sem cartão e sem mensalidade, e usa o pipeline com triagem por IA sem custo.'),
  ('home', 1, 'A IA decide quem é contratado?',
   'Não. A IA calcula um índice de aderência e explica pontos fortes e lacunas para ajudar a priorizar. Quem decide é sempre uma pessoa.'),
  ('home', 2, 'Como funcionam os dados dos candidatos?',
   'Seguimos a LGPD: o candidato consente, pode exportar ou excluir os próprios dados, e o contato só é liberado para a empresa depois da contratação.'),
  ('home', 3, 'Quando vale contratar uma especialista?',
   'Quando a vaga é difícil de preencher, urgente, ou o time não tem tempo para triar. A especialista faz a busca e entrega finalistas com parecer.'),
  ('contratar', 0, 'Quando eu pago?',
   'O valor é fechado por vaga e cobrado só depois da contratação.'),
  ('contratar', 1, 'E se a pessoa contratada sair?',
   'Dentro do prazo de garantia, reabrimos o processo sem custo para encontrar a reposição.'),
  ('contratar', 2, 'Quem conduz o processo?',
   'Uma recrutadora especialista no setor da vaga, com as ferramentas de IA da VagaLoop.'),
  ('recrutadores', 0, 'Preciso ter CNPJ?',
   'Não é obrigatório para começar. Para receber repasses, você informa CNPJ/MEI ou dados para pagamento.'),
  ('recrutadores', 1, 'Posso cancelar quando quiser?',
   'Sim, sem multa. E nos primeiros dias da assinatura você tem garantia com reembolso integral.'),
  ('recrutadores', 2, 'Os ganhos são garantidos?',
   'Não. O simulador mostra valores ilustrativos; o resultado depende das vagas que você fecha.');
