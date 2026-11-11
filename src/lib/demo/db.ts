import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";

/**
 * Banco do MODO DEMONSTRAÇÃO: Postgres embutido (PGlite) com as MESMAS migrações, gatilhos e RLS
 * de produção, mais o seed e dados fictícios. Vive na memória do servidor e recomeça a cada reinício.
 */
const g = globalThis as unknown as { __vagaloopDemoDb?: Promise<PGlite> };

const ROOT = process.cwd();
const read = (...p: string[]) => readFileSync(join(ROOT, "supabase", ...p), "utf8");

async function boot(): Promise<PGlite> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { unaccent } = await import("@electric-sql/pglite/contrib/unaccent");
  const { citext } = await import("@electric-sql/pglite/contrib/citext");
  const { pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto");
  const db = await PGlite.create({ extensions: { unaccent, citext, pgcrypto } });

  await db.exec(read("demo", "00_stub_supabase.sql"));
  for (const f of readdirSync(join(ROOT, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort()) {
    if (f.includes("embeddings")) continue; // pgvector não existe no PGlite
    await db.exec(read("migrations", f));
  }
  await db.exec(read("seed.sql"));
  await db.exec(read("demo", "95_demo_data.sql"));
  await db.exec(read("demo", "90_grants.sql"));
  // datas de publicação variadas para a listagem parecer real
  await db.exec(`update public.jobs set published_at = now() - interval '9 days' where title = 'Analista de Dados Pleno';
                 update public.jobs set published_at = now() - interval '2 days' where title = 'Estágio em Marketing Digital';`);
  return db;
}

export function getDemoDb() {
  if (!g.__vagaloopDemoDb) {
    g.__vagaloopDemoDb = boot().then(async (db) => {
      // calcula a aderência das candidaturas fictícias com o mesmo código de produção
      const { scoreApplication } = await import("@/lib/scoring");
      setTimeout(async () => {
        const { rows } = await db.query<{ id: string }>(`select id from public.applications where ai_status = 'pendente'`);
        for (const r of rows) await scoreApplication(r.id);
      }, 0);
      return db;
    });
    g.__vagaloopDemoDb.catch(() => { g.__vagaloopDemoDb = undefined; });
  }
  return g.__vagaloopDemoDb;
}
