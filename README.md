# VagaLoop

Recrutamento e seleção com IA + recrutadoras especialistas. Next.js 16 (App Router) + TypeScript + Tailwind 4 + Supabase (Postgres, Auth, Storage, Realtime, RLS).

> Projeto novo e independente. **Não compartilha código, banco, chaves nem repositório com o Vínculo.**

## Estado: Fase 1 (MVP) — branch `feat/fase-1-mvp`

| Entregue | Onde |
|---|---|
| Site público: home, quem somos, quero contratar (lead), recrutadoras (simulador + lead), termos, privacidade (LGPD), cookies | `src/app/(site)` |
| Vagas: filtros, paginação por cursor, rolagem infinita no celular, páginas por cidade, página da vaga com `JobPosting`, página da empresa com `Organization`, sitemap e robots | `src/app/(site)/vagas`, `src/app/sitemap.ts` |
| Auth com perfis (empresa, candidato, recrutadora), e-mail/senha, Google e LinkedIn, aceite de termos registrado | `src/app/actions/auth.ts`, `src/app/auth/callback` |
| Empresa: onboarding com CNPJ (validação + BrasilAPI), perfil com logo, equipe por convite | `src/app/empresa` |
| Lia (texto) e criação manual, vaga confidencial, perguntas de triagem/knockout, expiração, posições | `src/lib/ai/lia.ts`, `src/components/jobs` |
| Pipeline kanban: arrastar, mover em massa, lista com filtros/busca, etapas editáveis, adição manual, avaliação, tags, notas, histórico, tempo real | `src/components/pipeline`, `src/app/empresa/candidaturas` |
| Match score 0–100 + justificativa + ranking, com aviso de transparência | `src/lib/ai/match.ts`, `src/lib/scoring.ts` |
| Candidato: CV PDF/DOCX com leitura por IA, perfil completo, candidatura em poucos cliques, status em tempo real, vagas recomendadas, exportar/excluir dados | `src/app/candidato`, `src/app/(site)/candidatar` |
| E-mails transacionais por etapa (fila no banco + Resend) | `supabase/migrations/*02*`, `src/lib/email.ts` |
| Admin: métricas, leads (CRM simples), moderação com sinais de risco, verificação de empresas, papéis, configurações comerciais sem deploy (auditadas), FAQ e depoimentos | `src/app/admin` |

**Fica para as Fases 2 e 3** (o banco já tem `is_managed` e as configurações comerciais): serviço gerenciado completo, chat, áudio na Lia, sugestões da IA no pipeline, agendamento de entrevista, pagamentos/split, programa de recrutadoras (área da recrutadora hoje é só um aviso), WhatsApp, blog e landing pages SEO por estado/contrato, recalibração do match com o histórico de decisões (os eventos já são gravados em `application_events`).

## Regras de negócio garantidas no banco (não só na tela)

- **Contato protegido até a contratação**: e-mail, telefone e o arquivo original do CV ficam em tabelas/bucket separados; a empresa só lê depois que move a pessoa para "Contratado".
- **Vaga confidencial**: o público lê vagas só pela view `jobs_public`, que zera todas as colunas da empresa. E-mails e status do candidato dizem "Empresa confidencial".
- **Multi-tenant**: tudo da empresa passa por `is_company_member` / `can_manage_job` (RLS).
- Candidato não define o próprio score, avaliação ou knockout; ninguém vira admin pelo cadastro; suspensão de vaga só o admin tira.
- Mudar de etapa grava histórico, atualiza o status do candidato, notifica e enfileira o e-mail (gatilho).

## Rodar localmente

1. Node 20+ e um projeto Supabase (nuvem ou `supabase start`).
2. `cp .env.example .env.local` e preencha as chaves.
3. Aplique o banco: `supabase link` + `supabase db push`, ou cole os arquivos de `supabase/migrations` em ordem no SQL Editor.
4. Ambiente local apenas: `supabase db reset` aplica também `supabase/seed.sql` (logins `admin@`, `empresa@`, `candidata@vagaloop.dev`, senha `demo12345`). **Não rode o seed em produção.**
5. `npm install` e `npm run dev`.

Primeiro admin em produção: crie a conta pelo site e rode no SQL Editor
`update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'voce@empresa.com');`

No painel do Supabase: ative Google e LinkedIn (OIDC) em Authentication → Providers, e cadastre `https://SEU-DOMINIO/auth/callback` nas URLs de redirecionamento. Ajuste a configuração `site_url` em `/admin/configuracoes`.

## IA

`src/lib/ai/provider.ts` abstrai o provedor (Anthropic por padrão, via `ANTHROPIC_API_KEY`). **Sem chave, tudo funciona em modo básico**: a Lia usa regras locais e o match é heurístico e explicável. Embeddings (pgvector, 1536 dimensões) são opcionais via qualquer API compatível com `/v1/embeddings`. O match nunca recebe nome, gênero, idade, foto, PCD ou contato.

## Testes

```bash
npm test          # banco (PGlite + stubs do Supabase) e IA em modo básico
npm run typecheck
npm run build
```

`tests/db` cobre as 21 regras acima (confidencialidade, isolamento, contato protegido, histórico, e-mails, auditoria, storage, seed). O PGlite não tem pgvector, então a migração de embeddings não entra nesse teste.

## Publicação

Vercel: importe o repositório, configure as variáveis do `.env.example`. O `vercel.json` agenda `/api/cron/tarefas` a cada 10 min (reenvio de e-mails e scores pendentes) e exige `CRON_SECRET`. No plano gratuito da Vercel, cron só roda uma vez por dia; ajuste ou use outro agendador.

## Modo demonstração (sem Supabase)

Tour com as telas: [docs/demo](docs/demo/README.md).

```bash
npm install
npm run demo        # abre em http://localhost:3000
```

Usa um Postgres embutido (PGlite) com **as mesmas migrações, gatilhos e regras de acesso** de produção, mais dados fictícios (`supabase/demo/95_demo_data.sql`). Na tela de login aparecem botões para entrar como empresa, candidata, admin ou recrutadora (senha `demo12345`). Os e-mails não saem: ficam visíveis em `/demo/emails`. Não há tempo real: as telas de pipeline e candidaturas se atualizam a cada 8 segundos. Os dados voltam ao início quando o servidor reinicia.

Para publicar a demo na Vercel, crie um projeto a partir do repositório e defina só `NEXT_PUBLIC_DEMO_MODE=1`. Cada instância do servidor tem o próprio banco em memória, então o que você cria pode sumir quando a Vercel troca de instância.
