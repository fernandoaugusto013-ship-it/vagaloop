// Banco de teste: PGlite + stubs mínimos do Supabase (auth, storage, papéis, publicação realtime).
// A migração de embeddings (pgvector) é pulada porque o PGlite não traz a extensão.
import { PGlite } from "@electric-sql/pglite";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS = join(root, "supabase", "migrations");

const SUPABASE_STUB = readFileSync(join(root, "supabase", "demo", "00_stub_supabase.sql"), "utf8");

const GRANTS = readFileSync(join(root, "supabase", "demo", "90_grants.sql"), "utf8");

export const SEED = join(root, "supabase", "seed.sql");

export async function createDb() {
  const db = new PGlite({ extensions: { unaccent, citext, pgcrypto } });
  await db.exec(SUPABASE_STUB);
  // extensões criadas no schema extensions, como no Supabase
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    if (file.includes("embeddings")) continue;
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    try {
      await db.exec(sql);
    } catch (err) {
      err.message = `[${file}] ${err.message}`;
      throw err;
    }
  }
  await db.exec(GRANTS);
  return db;
}

/** Cria um usuário em auth.users (o gatilho cria profile etc.). */
export async function createUser(db, { email, role = "candidate", name = "Pessoa Teste" }) {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify({ role, full_name: name, terms_version: "2026-11" })],
  );
  return { id: rows[0].id, email };
}

/** Executa fn como o usuário (papel authenticated) ou como visitante (anon). */
export async function as(db, user, fn) {
  return db.transaction(async (tx) => {
    if (user === "service") {
      await tx.exec(`set local role service_role`);
    } else if (user) {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true),
                             set_config('request.jwt.claims', $2, true)`,
        [user.id, JSON.stringify({ sub: user.id, email: user.email, role: "authenticated" })]);
      await tx.exec(`set local role authenticated`);
    } else {
      await tx.exec(`set local role anon`);
    }
    return fn(tx);
  });
}

export async function rows(tx, sql, params = []) {
  return (await tx.query(sql, params)).rows;
}
