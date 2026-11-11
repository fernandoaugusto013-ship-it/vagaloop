import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDb, as, rows, SEED } from "./harness.mjs";

test("seed de demonstração aplica e respeita as regras", async () => {
  const db = await createDb();
  await db.exec(readFileSync(SEED, "utf8"));
  const roles = await rows(db, `select p.role, u.email from public.profiles p join auth.users u on u.id = p.id order by u.email`);
  assert.deepEqual(roles.map((r) => r.role), ["admin", "candidate", "company"]);
  await as(db, null, async (tx) => {
    const jobs = await rows(tx, `select title, company_name from public.jobs_public order by title`);
    assert.equal(jobs.length, 3);
    assert.equal(jobs.find((j) => j.title === "Gerente Comercial").company_name, null);
  });
});
