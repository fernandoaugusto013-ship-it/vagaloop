import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createDb, createUser, as, rows } from "./harness.mjs";

let db, admin, ownerA, memberA, ownerB, cand1, cand2;
let companyA, companyB, jobPublic, jobConfidential, jobB, appCand1;

before(async () => {
  db = await createDb();
  admin = await createUser(db, { email: "admin@vagaloop.test", role: "candidate", name: "Admin" });
  await db.query(`update public.profiles set role = 'admin' where id = $1`, [admin.id]);
  ownerA = await createUser(db, { email: "dona@acme.test", role: "company", name: "Ana Acme" });
  memberA = await createUser(db, { email: "membro@acme.test", role: "company", name: "Bruno Acme" });
  ownerB = await createUser(db, { email: "dono@beta.test", role: "company", name: "Caio Beta" });
  cand1 = await createUser(db, { email: "cand1@mail.test", name: "Daniela Souza" });
  cand2 = await createUser(db, { email: "cand2@mail.test", name: "Eduardo Lima" });

  companyA = await as(db, ownerA, async (tx) =>
    (await rows(tx, `insert into public.companies (name, cnpj) values ('Acme Ltda', '11222333000181') returning id, slug`))[0]);
  companyB = await as(db, ownerB, async (tx) =>
    (await rows(tx, `insert into public.companies (name) values ('Beta SA') returning id`))[0]);
  await db.query(`insert into public.company_members (company_id, user_id) values ($1, $2)`, [companyA.id, memberA.id]);

  const mkJob = (owner, cid, title, confidential) => as(db, owner, async (tx) =>
    (await rows(tx, `insert into public.jobs (company_id, title, contract_type, work_mode, city, uf, status, is_confidential,
                       description, requirements)
                     values ($1, $2, 'clt', 'hibrido', 'São Paulo', 'SP', 'publicada', $3, 'Descrição da vaga', '{React,TypeScript}')
                     returning id, slug, city_slug`, [cid, title, confidential]))[0]);
  jobPublic = await mkJob(ownerA, companyA.id, "Desenvolvedora Front-end Pleno", false);
  jobConfidential = await mkJob(ownerA, companyA.id, "Gerente Comercial", true);
  jobB = await mkJob(ownerB, companyB.id, "Analista Financeiro", false);

  await as(db, ownerA, (tx) => tx.query(
    `insert into public.job_screening_questions (job_id, question, kind, is_knockout, expected_answer)
     values ($1, 'Tem disponibilidade para híbrido?', 'yes_no', true, 'sim')`, [jobPublic.id]));
});

test("slugs de vaga e cidade são gerados", () => {
  assert.match(jobPublic.slug, /^desenvolvedora-front-end-pleno-[0-9a-f]{6}$/);
  assert.equal(jobPublic.city_slug, "sao-paulo-sp");
  assert.equal(companyA.slug, "acme-ltda");
});

test("visitante não lê a tabela jobs, só a view pública", async () => {
  await as(db, null, async (tx) => {
    assert.equal((await rows(tx, `select id from public.jobs`)).length, 0);
    assert.equal((await rows(tx, `select id from public.jobs_public`)).length, 3);
    assert.equal((await rows(tx, `select id from public.companies`)).length, 0);
    assert.equal((await rows(tx, `select user_id from public.candidate_profiles`)).length, 0);
  });
});

test("vaga confidencial não expõe a empresa em nenhuma coluna", async () => {
  await as(db, null, async (tx) => {
    const [row] = await rows(tx, `select * from public.jobs_public where id = $1`, [jobConfidential.id]);
    for (const col of ["company_id", "company_slug", "company_name", "company_logo_url", "company_website", "company_about"]) {
      assert.equal(row[col], null, col);
    }
    assert.ok(!JSON.stringify(row).includes("Acme"), "nome da empresa vazou");
    // e a página da empresa não lista a vaga confidencial
    const [c] = await rows(tx, `select open_jobs from public.companies_public where slug = 'acme-ltda'`);
    assert.equal(c.open_jobs, 1);
  });
});

test("isolamento entre empresas (multi-tenant)", async () => {
  await as(db, ownerB, async (tx) => {
    const ids = (await rows(tx, `select id from public.jobs`)).map((r) => r.id);
    assert.deepEqual(ids, [jobB.id]);
    const upd = await tx.query(`update public.jobs set title = 'hack' where id = $1`, [jobPublic.id]);
    assert.equal(upd.affectedRows, 0);
    assert.equal((await rows(tx, `select * from public.pipeline_stages where job_id = $1`, [jobPublic.id])).length, 0);
  });
  await as(db, memberA, async (tx) => {
    assert.equal((await rows(tx, `select id from public.jobs`)).length, 2);
  });
});

test("candidato não cria empresa nem se promove a admin", async () => {
  await assert.rejects(as(db, cand1, (tx) => tx.query(`insert into public.companies (name) values ('Fake')`)));
  await assert.rejects(as(db, cand1, (tx) => tx.query(`update public.profiles set role = 'admin' where id = $1`, [cand1.id])));
});

test("cadastro nunca cria admin pelo metadado", async () => {
  const u = await createUser(db, { email: "esperto@mail.test", role: "admin" });
  const [p] = await rows(db, `select role from public.profiles where id = $1`, [u.id]);
  assert.equal(p.role, "candidate");
});

test("candidatura: candidato se candidata, knockout calculado no banco, campos internos ignorados", async () => {
  const [q] = await rows(db, `select id from public.job_screening_questions where job_id = $1`, [jobPublic.id]);
  await as(db, cand1, (tx) => tx.query(
    `insert into public.applications (job_id, candidate_id, answers, match_score, rating)
     values ($1, $2, $3, 100, 5)`,
    [jobPublic.id, cand1.id, JSON.stringify([{ question_id: q.id, answer: "Sim" }])]));
  await as(db, cand2, (tx) => tx.query(
    `insert into public.applications (job_id, candidate_id, answers) values ($1, $2, $3)`,
    [jobPublic.id, cand2.id, JSON.stringify([{ question_id: q.id, answer: "não" }])]));

  const apps = await rows(db, `select a.*, s.kind from public.applications a join public.pipeline_stages s on s.id = a.stage_id
                               where a.job_id = $1 order by a.created_at`, [jobPublic.id]);
  assert.equal(apps.length, 2);
  appCand1 = apps.find((a) => a.candidate_id === cand1.id);
  assert.equal(appCand1.kind, "inscritos");
  assert.equal(appCand1.match_score, null, "candidato não pode definir o próprio score");
  assert.equal(appCand1.rating, null);
  assert.equal(appCand1.knockout_failed, false);
  assert.equal(apps.find((a) => a.candidate_id === cand2.id).knockout_failed, true);

  // não pode se candidatar em nome de outra pessoa
  await assert.rejects(as(db, cand1, (tx) => tx.query(
    `insert into public.applications (job_id, candidate_id) values ($1, $2)`, [jobB.id, cand2.id])));
});

test("candidato vê só o próprio status, sem colunas internas", async () => {
  await as(db, cand1, async (tx) => {
    assert.equal((await rows(tx, `select * from public.applications`)).length, 0);
    const st = await rows(tx, `select * from public.application_status`);
    assert.equal(st.length, 1);
    assert.equal(st[0].stage_name, "Inscritos");
    assert.ok(!("match_score" in st[0]) && !("rating" in st[0]));
  });
});

test("contato protegido até a contratação", async () => {
  await as(db, ownerA, async (tx) => {
    // perfil profissional visível; contato e CV não
    assert.equal((await rows(tx, `select user_id from public.candidate_profiles where user_id = $1`, [cand1.id])).length, 1);
    assert.equal((await rows(tx, `select * from public.candidate_contacts where user_id = $1`, [cand1.id])).length, 0);
    const [p] = await rows(tx, `select full_name from public.profiles where id = $1`, [cand1.id]);
    assert.equal(p.full_name, "Daniela Souza");
  });
  await db.query(`insert into public.resumes (user_id, storage_path, file_name, mime_type, size_bytes)
                  values ($1, $2, 'cv.pdf', 'application/pdf', 1000)`, [cand1.id, `${cand1.id}/cv.pdf`]);
  await as(db, ownerA, async (tx) => {
    assert.equal((await rows(tx, `select * from public.resumes where user_id = $1`, [cand1.id])).length, 0);
  });
  // a outra empresa não vê nem o perfil profissional
  await as(db, ownerB, async (tx) => {
    assert.equal((await rows(tx, `select * from public.candidate_profiles where user_id = $1`, [cand1.id])).length, 0);
  });

  const [hired] = await rows(db, `select id from public.pipeline_stages where job_id = $1 and kind = 'contratado'`, [jobPublic.id]);
  await as(db, memberA, (tx) => tx.query(`update public.applications set stage_id = $1 where id = $2`, [hired.id, appCand1.id]));

  await as(db, ownerA, async (tx) => {
    const c = await rows(tx, `select email from public.candidate_contacts where user_id = $1`, [cand1.id]);
    assert.equal(c[0]?.email, "cand1@mail.test");
    assert.equal((await rows(tx, `select * from public.resumes where user_id = $1`, [cand1.id])).length, 1);
  });
  await as(db, ownerB, async (tx) => {
    assert.equal((await rows(tx, `select * from public.candidate_contacts where user_id = $1`, [cand1.id])).length, 0);
  });
});

test("mudança de etapa registra histórico, notifica e enfileira e-mail", async () => {
  const ev = await rows(db, `select type from public.application_events where application_id = $1 order by created_at`, [appCand1.id]);
  assert.deepEqual(ev.map((e) => e.type), ["criada", "etapa", "contato_liberado"]);
  const [st] = await rows(db, `select stage_kind, stage_name from public.application_status where application_id = $1`, [appCand1.id]);
  assert.equal(st.stage_kind, "contratado");
  const mails = await rows(db, `select template_key, to_email, subject from public.email_outbox
                                where related->>'application_id' = $1 order by created_at`, [appCand1.id]);
  assert.deepEqual(mails.map((m) => m.template_key), ["candidatura_recebida", "aprovacao"]);
  assert.ok(mails[1].subject.includes("Desenvolvedora Front-end Pleno"));
  const notes = await rows(db, `select type from public.notifications where user_id = $1`, [cand1.id]);
  assert.ok(notes.some((n) => n.type === "etapa"));
  const [app] = await rows(db, `select hired_at from public.applications where id = $1`, [appCand1.id]);
  assert.ok(app.hired_at);
});

test("empresa não mexe no score de IA nem move para etapa de outra vaga", async () => {
  await assert.rejects(as(db, ownerA, (tx) => tx.query(
    `update public.applications set match_score = 99 where id = $1`, [appCand1.id])));
  const [other] = await rows(db, `select id from public.pipeline_stages where job_id = $1 limit 1`, [jobConfidential.id]);
  await assert.rejects(as(db, ownerA, (tx) => tx.query(
    `update public.applications set stage_id = $1 where id = $2`, [other.id, appCand1.id])));
  // servidor (service_role) grava o score
  await as(db, "service", (tx) => tx.query(
    `update public.applications set match_score = 82, ai_status = 'ok' where id = $1`, [appCand1.id]));
});

test("e-mail de vaga confidencial não cita a empresa", async () => {
  await as(db, cand2, (tx) => tx.query(
    `insert into public.applications (job_id, candidate_id) values ($1, $2)`, [jobConfidential.id, cand2.id]));
  const [m] = await rows(db, `select subject, body from public.email_outbox where to_email = 'cand2@mail.test'
                              and body like '%Gerente Comercial%'`);
  assert.ok(m.body.includes("Empresa confidencial"));
  assert.ok(!m.body.includes("Acme"));
  await as(db, cand2, async (tx) => {
    const st = await rows(tx, `select company_label from public.application_status where job_id = $1`, [jobConfidential.id]);
    assert.equal(st[0].company_label, "Empresa confidencial");
  });
});

test("adição manual de candidato pela empresa", async () => {
  await as(db, ownerA, (tx) => tx.query(
    `insert into public.applications (job_id, external_candidate, source) values ($1, $2, 'manual')`,
    [jobPublic.id, JSON.stringify({ nome: "Fernanda Indicação", email: "fe@mail.test" })]));
  const [m] = await rows(db, `select knockout_failed from public.applications where external_candidate->>'nome' = 'Fernanda Indicação'`);
  assert.equal(m.knockout_failed, false, "adição manual não passa por pergunta eliminatória");
  await assert.rejects(as(db, ownerB, (tx) => tx.query(
    `insert into public.applications (job_id, external_candidate, source) values ($1, $2, 'manual')`,
    [jobPublic.id, JSON.stringify({ nome: "Intrusa" })])));
});

test("leads: visitante envia, só admin lê", async () => {
  await as(db, null, (tx) => tx.query(
    `insert into public.leads (type, name, email) values ('contratar', 'Gabi', 'gabi@empresa.test')`));
  await as(db, ownerA, async (tx) => assert.equal((await rows(tx, `select * from public.leads`)).length, 0));
  await as(db, admin, async (tx) => assert.equal((await rows(tx, `select * from public.leads`)).length, 1));
});

test("configurações comerciais: públicas legíveis, só admin altera, com auditoria", async () => {
  await as(db, null, async (tx) => {
    const r = await rows(tx, `select value from public.settings where key = 'recruiter_monthly_fee'`);
    assert.equal(r[0].value, 490);
    assert.equal((await rows(tx, `select * from public.settings where key = 'site_url'`)).length, 0);
  });
  const upd = await as(db, ownerA, (tx) => tx.query(`update public.settings set value = '1' where key = 'platform_split_pct'`));
  assert.equal(upd.affectedRows, 0);
  await as(db, admin, (tx) => tx.query(`update public.settings set value = '45' where key = 'platform_split_pct'`));
  const [log] = await rows(db, `select data from public.audit_logs where entity = 'settings' and entity_id = 'platform_split_pct'`);
  assert.equal(log.data.para, 45);
});

test("moderação: empresa não tira a vaga da suspensão", async () => {
  await as(db, admin, (tx) => tx.query(`update public.jobs set status = 'suspensa' where id = $1`, [jobB.id]));
  await assert.rejects(as(db, ownerB, (tx) => tx.query(`update public.jobs set status = 'publicada' where id = $1`, [jobB.id])));
  await as(db, null, async (tx) =>
    assert.equal((await rows(tx, `select id from public.jobs_public where id = $1`, [jobB.id])).length, 0));
});

test("convite de membro: só o e-mail convidado aceita", async () => {
  const outsider = await createUser(db, { email: "novo@acme.test", role: "company" });
  const intruso = await createUser(db, { email: "intruso@x.test", role: "company" });
  const [inv] = await as(db, ownerA, (tx) => rows(tx,
    `insert into public.company_invites (company_id, email) values ($1, 'novo@acme.test') returning token`, [companyA.id]));
  await assert.rejects(as(db, intruso, (tx) => tx.query(`select public.accept_company_invite($1)`, [inv.token])));
  await as(db, outsider, (tx) => tx.query(`select public.accept_company_invite($1)`, [inv.token]));
  await as(db, outsider, async (tx) => assert.equal((await rows(tx, `select id from public.jobs`)).length, 2));
});

test("LGPD: exportar meus dados traz só os meus", async () => {
  const [r] = await as(db, cand1, (tx) => rows(tx, `select public.export_my_data() as d`));
  assert.equal(r.d.perfil.id, cand1.id);
  assert.equal(r.d.candidaturas.length, 1);
  assert.equal(r.d.contato.email, "cand1@mail.test");
});

test("storage: CV só do dono, ou da empresa após contratação", async () => {
  await db.query(`insert into storage.objects (bucket_id, name) values ('resumes', $1), ('resumes', $2)`,
    [`${cand1.id}/cv.pdf`, `${cand2.id}/cv.pdf`]);
  await as(db, ownerA, async (tx) => {
    const names = (await rows(tx, `select name from storage.objects where bucket_id = 'resumes'`)).map((r) => r.name);
    assert.deepEqual(names, [`${cand1.id}/cv.pdf`]); // cand1 contratado; cand2 não
  });
  await as(db, cand2, async (tx) => {
    assert.equal((await rows(tx, `select name from storage.objects`)).length, 1);
  });
});

test("estatísticas públicas da home", async () => {
  const [r] = await as(db, null, (tx) => rows(tx, `select public.platform_stats() as s`));
  assert.equal(r.s.empresas, 2);
  assert.equal(r.s.contratacoes, 1);
  assert.equal(r.s.vagas_abertas, 2);
});
