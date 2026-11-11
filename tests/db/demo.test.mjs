import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDb, rows, SEED } from "./harness.mjs";

test("dados da demonstração aplicam sobre seed e migrações", async () => {
  const db = await createDb();
  await db.exec(readFileSync(SEED, "utf8"));
  await db.exec(readFileSync(new URL("../../supabase/demo/95_demo_data.sql", import.meta.url), "utf8"));
  const [c] = await rows(db, `select (select count(*) from public.jobs_public)::int jobs, (select count(*) from public.applications)::int apps,
                                     (select count(*) from public.application_events)::int ev, (select count(*) from public.email_outbox)::int mails`);
  assert.ok(c.jobs >= 12, JSON.stringify(c));
  assert.ok(c.apps >= 11);
  assert.ok(c.ev > c.apps);
  const [h] = await rows(db, `select count(*)::int n from public.applications where hired_at is not null`);
  assert.equal(h.n, 1);
});
