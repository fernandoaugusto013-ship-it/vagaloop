import "server-only";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import { getDemoDb } from "./db";

/**
 * Cliente "tipo Supabase" do MODO DEMONSTRAÇÃO.
 * Implementa o subconjunto da API do supabase-js que a VagaLoop usa e traduz para SQL no PGlite,
 * executando como o usuário logado (papel authenticated + auth.uid()), então o RLS de produção vale aqui também.
 */

export type Who = { kind: "user"; id: string; email: string } | { kind: "anon" } | { kind: "service" };
type PgError = { message: string; code?: string };
type Result<T = unknown> = { data: T; error: PgError | null; count?: number | null };

// ------------------------------------------------------------------ execução com papel
async function asWho<T>(who: Who, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = await getDemoDb();
  return db.transaction(async (tx) => {
    if (who.kind === "service") await tx.exec("set local role service_role");
    else if (who.kind === "anon") await tx.exec("set local role anon");
    else {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`,
        [who.id, JSON.stringify({ sub: who.id, email: who.email, role: "authenticated" })]);
      await tx.exec("set local role authenticated");
    }
    return fn(tx);
  });
}

function toError(e: unknown): PgError {
  const err = e as { message?: string; code?: string };
  return { message: err?.message ?? String(e), code: err?.code };
}

// ------------------------------------------------------------------ metadados de relacionamentos (para embeds)
type Fk = { name: string; tbl: string; col: string; ftbl: string; fcol: string };
let meta: Promise<{ fks: Fk[]; unique: Set<string> }> | null = null;
function getMeta() {
  meta ??= getDemoDb().then(async (db: PGlite) => {
    const fks = (await db.query<Fk>(`
      select c.conname as name, cl.relname as tbl, a.attname as col, fcl.relname as ftbl, fa.attname as fcol
        from pg_constraint c
        join pg_class cl on cl.oid = c.conrelid join pg_namespace n on n.oid = cl.relnamespace and n.nspname = 'public'
        join pg_class fcl on fcl.oid = c.confrelid join pg_namespace fn on fn.oid = fcl.relnamespace and fn.nspname = 'public'
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
        join pg_attribute fa on fa.attrelid = c.confrelid and fa.attnum = c.confkey[1]
       where c.contype = 'f' and array_length(c.conkey, 1) = 1`)).rows;
    const uq = (await db.query<{ k: string }>(`
      select cl.relname || '.' || a.attname as k from pg_constraint c
        join pg_class cl on cl.oid = c.conrelid join pg_namespace n on n.oid = cl.relnamespace and n.nspname = 'public'
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
       where c.contype in ('p', 'u') and array_length(c.conkey, 1) = 1`)).rows;
    return { fks, unique: new Set(uq.map((r) => r.k)) };
  });
  return meta;
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
function ident(s: string) {
  if (!IDENT.test(s)) throw new Error(`Identificador inválido na demo: ${s}`);
  return `"${s}"`;
}

// ------------------------------------------------------------------ select com embeds estilo PostgREST
function splitTop(s: string) {
  const out: string[] = [];
  let depth = 0, cur = "", quote = false;
  for (const ch of s) {
    if (ch === '"') quote = !quote;
    if (!quote && ch === "(") depth++;
    if (!quote && ch === ")") depth--;
    if (!quote && depth === 0 && ch === ",") { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

let aliasSeq = 0;
async function selectExpr(table: string, alias: string, cols: string): Promise<string> {
  const { fks, unique } = await getMeta();
  const parts: string[] = [];
  const plain: string[] = [];
  for (const item of splitTop(cols.replace(/\s+/g, " ").trim() || "*")) {
    const m = item.match(/^(?:([a-z_][a-z0-9_]*):)?([a-z_][a-z0-9_]*)(?:!([a-z0-9_]+))?\((.*)\)$/s);
    if (!m) {
      if (item === "*") parts.push(`to_jsonb(${alias})`);
      else plain.push(item);
      continue;
    }
    const [, as, rel, hint, inner] = m;
    const key = as ?? rel;
    const cand = fks.filter((f) => (!hint || f.name === hint) &&
      ((f.tbl === table && f.ftbl === rel) || (f.tbl === rel && f.ftbl === table)));
    const fk = cand[0];
    if (!fk) throw new Error(`Relação desconhecida na demo: ${table} → ${rel}`);
    const sub = `e${++aliasSeq}`;
    let subSql: string;
    if (fk.tbl === table && fk.ftbl === rel) {
      // muitos-para-um: objeto
      subSql = `(select ${await selectExpr(rel, sub, inner)} from public.${ident(rel)} ${sub} where ${sub}.${ident(fk.fcol)} = ${alias}.${ident(fk.col)} limit 1)`;
    } else if (inner.trim() === "count") {
      subSql = `jsonb_build_array(jsonb_build_object('count', (select count(*) from public.${ident(rel)} ${sub} where ${sub}.${ident(fk.col)} = ${alias}.${ident(fk.fcol)})))`;
    } else if (unique.has(`${fk.tbl}.${fk.col}`)) {
      // um-para-um (FK que também é PK/única): objeto
      subSql = `(select ${await selectExpr(rel, sub, inner)} from public.${ident(rel)} ${sub} where ${sub}.${ident(fk.col)} = ${alias}.${ident(fk.fcol)} limit 1)`;
    } else {
      subSql = `(select coalesce(jsonb_agg(${await selectExpr(rel, sub, inner)}), '[]'::jsonb) from public.${ident(rel)} ${sub} where ${sub}.${ident(fk.col)} = ${alias}.${ident(fk.fcol)})`;
    }
    parts.push(`jsonb_build_object('${key}', ${subSql})`);
  }
  if (plain.length) parts.unshift(`jsonb_build_object(${plain.map((c) => `'${c}', ${alias}.${ident(c)}`).join(", ")})`);
  return parts.length ? parts.join(" || ") : `to_jsonb(${alias})`;
}

// ------------------------------------------------------------------ filtros
type Cond = { sql: (p: Params) => string };
class Params {
  values: unknown[] = [];
  add(v: unknown) {
    this.values.push(v && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v);
    return `$${this.values.length}`;
  }
}

const OPS: Record<string, string> = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike" };

function parseOrValue(v: string) {
  return v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
}

function orExpr(expr: string, alias: string, joiner: "or" | "and", p: Params): string {
  const items = splitTop(expr).map((it) => {
    const nested = it.match(/^(and|or)\((.*)\)$/s);
    if (nested) return `(${orExpr(nested[2], alias, nested[1] as "and" | "or", p)})`;
    const m = it.match(/^([a-z_][a-z0-9_]*)\.(not\.)?([a-z]+)\.(.*)$/s);
    if (!m) throw new Error(`Filtro or() não suportado na demo: ${it}`);
    const [, col, not, op, raw] = m;
    const value = parseOrValue(raw);
    let sql: string;
    if (op === "is") sql = `${alias}.${ident(col)} is ${value === "null" ? "null" : value === "true" ? "true" : "false"}`;
    else if (op === "in") sql = `${alias}.${ident(col)} = any(${p.add(value.replace(/^\(|\)$/g, "").split(",").map(parseOrValue))})`;
    else if (OPS[op]) sql = `${alias}.${ident(col)} ${OPS[op]} ${p.add(value)}`;
    else throw new Error(`Operador não suportado na demo: ${op}`);
    return not ? `not (${sql})` : sql;
  });
  return items.join(` ${joiner} `);
}

// ------------------------------------------------------------------ construtor de consultas
class Query<T = unknown> implements PromiseLike<Result<T>> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" | null = null;
  private cols = "*";
  private returning: string | null = null;
  private countMode = false;
  private head = false;
  private values: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private conds: Cond[] = [];
  private orders: { col: string; asc: boolean; nullsFirst?: boolean }[] = [];
  private lim: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";

  constructor(private getWho: () => Promise<Who>, private table: string) { ident(table); }

  select(cols = "*", opts?: { count?: "exact"; head?: boolean }) {
    if (this.op === null) { this.op = "select"; this.cols = cols; this.countMode = !!opts?.count; this.head = !!opts?.head; }
    else this.returning = cols;
    return this;
  }
  insert(v: Record<string, unknown> | Record<string, unknown>[]) { this.op = "insert"; this.values = v; return this; }
  upsert(v: Record<string, unknown> | Record<string, unknown>[]) { this.op = "upsert"; this.values = v; return this; }
  update(v: Record<string, unknown>) { this.op = "update"; this.values = v; return this; }
  delete() { this.op = "delete"; return this; }

  private add(fn: (p: Params) => string) { this.conds.push({ sql: fn }); return this; }
  eq(c: string, v: unknown) { return this.add((p) => `t.${ident(c)} = ${p.add(v)}`); }
  neq(c: string, v: unknown) { return this.add((p) => `t.${ident(c)} <> ${p.add(v)}`); }
  gt(c: string, v: unknown) { return this.add((p) => `t.${ident(c)} > ${p.add(v)}`); }
  gte(c: string, v: unknown) { return this.add((p) => `t.${ident(c)} >= ${p.add(v)}`); }
  lt(c: string, v: unknown) { return this.add((p) => `t.${ident(c)} < ${p.add(v)}`); }
  lte(c: string, v: unknown) { return this.add((p) => `t.${ident(c)} <= ${p.add(v)}`); }
  ilike(c: string, v: string) { return this.add((p) => `t.${ident(c)} ilike ${p.add(v)}`); }
  in(c: string, v: unknown[]) { return this.add((p) => `t.${ident(c)} = any(${p.add(v)})`); }
  is(c: string, v: null | boolean) { return this.add(() => `t.${ident(c)} is ${v === null ? "null" : v ? "true" : "false"}`); }
  not(c: string, op: string, v: unknown) {
    if (op === "is") return this.add(() => `t.${ident(c)} is not ${v === null || v === "null" ? "null" : v ? "true" : "false"}`);
    return this.add((p) => `not (t.${ident(c)} ${OPS[op] ?? "="} ${p.add(v)})`);
  }
  or(expr: string) { return this.add((p) => `(${orExpr(expr, "t", "or", p)})`); }
  textSearch(c: string, q: string, opts?: { type?: "websearch" | "plain" | "phrase"; config?: string }) {
    const fn = opts?.type === "websearch" ? "websearch_to_tsquery" : opts?.type === "phrase" ? "phraseto_tsquery" : "plainto_tsquery";
    const cfg = opts?.config && IDENT.test(opts.config) ? opts.config : "simple";
    return this.add((p) => `t.${ident(c)} @@ ${fn}('${cfg}', ${p.add(q)})`);
  }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) { this.orders.push({ col, asc: opts?.ascending ?? true, nullsFirst: opts?.nullsFirst }); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.mode = "single"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }

  then<A = Result<T>, B = never>(ok?: ((v: Result<T>) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.run().then(ok, fail);
  }

  private where(p: Params) {
    return this.conds.length ? ` where ${this.conds.map((c) => c.sql(p)).join(" and ")}` : "";
  }

  private async run(): Promise<Result<T>> {
    try {
      const rows = await this.execute(await this.getWho());
      if (this.head) return { data: null as T, error: null, count: rows.count };
      const list = rows.list;
      if (this.mode === "single") {
        if (list.length !== 1) return { data: null as T, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
        return { data: list[0] as T, error: null };
      }
      if (this.mode === "maybe") return { data: (list[0] ?? null) as T, error: null };
      return { data: (this.op === "select" || this.returning ? list : null) as T, error: null, count: rows.count };
    } catch (e) {
      return { data: null as T, error: toError(e) };
    }
  }

  private pick(r: Record<string, unknown>) {
    if (!this.returning || this.returning.trim() === "*") return r;
    return Object.fromEntries(splitTop(this.returning).map((k) => [k, r[k]]));
  }

  private async execute(who: Who): Promise<{ list: unknown[]; count: number | null }> {
    const t = `public.${ident(this.table)}`;
    const p = new Params();
    if (this.op === "select") {
      if (this.head) {
        const sql = `select count(*)::int as n from ${t} t${this.where(p)}`;
        const r = await asWho(who, (tx) => tx.query<{ n: number }>(sql, p.values));
        return { list: [], count: r.rows[0].n };
      }
      const expr = await selectExpr(this.table, "t", this.cols);
      const order = this.orders.length
        ? ` order by ${this.orders.map((o) => `t.${ident(o.col)} ${o.asc ? "asc" : "desc"} nulls ${(o.nullsFirst ?? !o.asc) ? "first" : "last"}`).join(", ")}`
        : "";
      const sql = `select ${expr} as r from ${t} t${this.where(p)}${order}${this.lim ? ` limit ${Math.floor(this.lim)}` : ""}`;
      const r = await asWho(who, (tx) => tx.query<{ r: unknown }>(sql, p.values));
      return { list: r.rows.map((x) => x.r), count: this.countMode ? r.rows.length : null };
    }
    if (this.op === "insert" || this.op === "upsert") {
      const items = Array.isArray(this.values) ? this.values : [this.values!];
      const out: unknown[] = [];
      await asWho(who, async (tx) => {
        for (const item of items) {
          const keys = Object.keys(item).map(ident);
          // como o PostgREST: sem .select() não há RETURNING (que exigiria permissão de leitura pelo RLS)
          const sql = `insert into ${t} as t (${keys.join(", ")}) select ${keys.join(", ")} from jsonb_populate_record(null::${t}, $1::jsonb)` +
            `${this.op === "upsert" ? " on conflict do nothing" : ""}${this.returning ? " returning to_jsonb(t) as r" : ""}`;
          const r = await tx.query<{ r: Record<string, unknown> }>(sql, [JSON.stringify(item)]);
          out.push(...r.rows.map((x) => this.pick(x.r)));
        }
      });
      return { list: out, count: null };
    }
    if (this.op === "update") {
      const keys = Object.keys(this.values as object).map(ident);
      const v = p.add(this.values);
      const sql = `update ${t} as t set (${keys.join(", ")}) = (select ${keys.join(", ")} from jsonb_populate_record(null::${t}, ${v}::jsonb))` +
        `${this.where(p)}${this.returning ? " returning to_jsonb(t) as r" : ""}`;
      const r = await asWho(who, (tx) => tx.query<{ r: Record<string, unknown> }>(sql, p.values));
      return { list: r.rows.map((x) => this.pick(x.r)), count: null };
    }
    if (this.op === "delete") {
      const sql = `delete from ${t} as t${this.where(p)}${this.returning ? " returning to_jsonb(t) as r" : ""}`;
      const r = await asWho(who, (tx) => tx.query<{ r: Record<string, unknown> }>(sql, p.values));
      return { list: r.rows.map((x) => this.pick(x.r)), count: null };
    }
    throw new Error("Operação não definida");
  }
}

// ------------------------------------------------------------------ rpc
async function rpc(who: Who, name: string, args: Record<string, unknown> = {}): Promise<Result> {
  try {
    ident(name);
    const db = await getDemoDb();
    const { rows: [fn] } = await db.query<{ retset: boolean }>(`select proretset as retset from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname = $1 limit 1`, [name]);
    if (!fn) return { data: null, error: { message: `Função ${name} não existe na demo` } };
    const p = new Params();
    const argSql = Object.entries(args).map(([k, v]) => `${ident(k)} => ${p.add(v)}${v && typeof v === "object" && !Array.isArray(v) ? "::jsonb" : ""}`).join(", ");
    if (fn.retset) {
      const r = await asWho(who, (tx) => tx.query<{ r: unknown }>(`select to_jsonb(x) as r from public.${ident(name)}(${argSql}) x`, p.values));
      return { data: r.rows.map((x) => x.r), error: null };
    }
    const r = await asWho(who, (tx) => tx.query<{ r: unknown }>(`select to_jsonb(public.${ident(name)}(${argSql})) as r`, p.values));
    return { data: r.rows[0]?.r ?? null, error: null };
  } catch (e) {
    return { data: null, error: toError(e) };
  }
}

// ------------------------------------------------------------------ storage em memória (respeitando o RLS de storage.objects)
const g = globalThis as unknown as { __vagaloopDemoFiles?: Map<string, { bytes: Uint8Array; type: string }> };
export const demoFiles = (g.__vagaloopDemoFiles ??= new Map());

function storage(who: Who) {
  return {
    from(bucket: string) {
      return {
        async upload(path: string, file: Blob, opts?: { contentType?: string; upsert?: boolean }) {
          try {
            await asWho(who, (tx) => tx.query(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, path]));
            demoFiles.set(`${bucket}/${path}`, { bytes: new Uint8Array(await file.arrayBuffer()), type: opts?.contentType ?? file.type });
            return { data: { path }, error: null };
          } catch (e) { return { data: null, error: toError(e) }; }
        },
        getPublicUrl(path: string) { return { data: { publicUrl: `/api/demo/arquivo/${bucket}/${path}` } }; },
        async createSignedUrl(path: string) {
          const ok = await canRead(who, bucket, path);
          return ok ? { data: { signedUrl: `/api/demo/arquivo/${bucket}/${path}` }, error: null } : { data: null, error: { message: "Object not found" } };
        },
        async list(prefix: string) {
          const r = await asWho(who, (tx) => tx.query<{ name: string }>(`select name from storage.objects where bucket_id = $1 and name like $2`, [bucket, `${prefix}/%`]));
          return { data: r.rows.map((x) => ({ name: x.name.slice(prefix.length + 1) })), error: null };
        },
        async remove(paths: string[]) {
          await asWho(who, (tx) => tx.query(`delete from storage.objects where bucket_id = $1 and name = any($2)`, [bucket, paths]));
          paths.forEach((p) => demoFiles.delete(`${bucket}/${p}`));
          return { data: paths, error: null };
        },
      };
    },
  };
}

export async function canRead(who: Who, bucket: string, path: string) {
  const r = await asWho(who, (tx) => tx.query(`select 1 from storage.objects where bucket_id = $1 and name = $2`, [bucket, path]));
  return r.rows.length > 0;
}

// ------------------------------------------------------------------ auth
export type SessionStore = { get(): string | null; set(userId: string | null): void };

async function userById(id: string) {
  const db = await getDemoDb();
  const r = await db.query<{ id: string; email: string; created_at: string }>(`select id, email, created_at from auth.users where id = $1`, [id]);
  return r.rows[0] ?? null;
}

export function createDemoClient(session: SessionStore | null, service = false) {
  let current: Who = service ? { kind: "service" } : { kind: "anon" };
  const ready = (async () => {
    const id = session?.get();
    if (!service && id && /^[0-9a-f-]{36}$/.test(id)) {
      const u = await userById(id);
      if (u) current = { kind: "user", id: u.id, email: u.email };
    }
  })();
  const who = () => current;

  const client = {
    // a sessão é resolvida antes da primeira consulta
    from: (table: string) => new Query(() => ready.then(who), table),
    rpc: async (name: string, args?: Record<string, unknown>) => { await ready; return rpc(who(), name, args); },
    get storage() { return storage(who()); },
    auth: {
      async getUser() {
        await ready;
        const w = who();
        if (w.kind !== "user") return { data: { user: null }, error: null };
        const u = await userById(w.id);
        return { data: { user: u ? { id: u.id, email: u.email } : null }, error: null };
      },
      async getClaims() { await ready; const w = who(); return { data: w.kind === "user" ? { claims: { sub: w.id } } : null, error: null }; },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const db = await getDemoDb();
        const r = await db.query<{ id: string; email: string }>(
          `select id, email from auth.users where lower(email) = lower($1) and encrypted_password = extensions.crypt($2, encrypted_password)`, [email, password]);
        const u = r.rows[0];
        if (!u) return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
        session?.set(u.id);
        current = { kind: "user", id: u.id, email: u.email };
        return { data: { user: { id: u.id, email: u.email }, session: {} }, error: null };
      },
      async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
        const db = await getDemoDb();
        try {
          const r = await db.query<{ id: string }>(
            `insert into auth.users (instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
             values ('00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', lower($1), extensions.crypt($2, extensions.gen_salt('bf')), now(),
                     '{"provider":"email"}', $3::jsonb, now(), now()) returning id`, [email, password, JSON.stringify(options?.data ?? {})]);
          const id = r.rows[0].id;
          session?.set(id);
          current = { kind: "user", id, email };
          return { data: { user: { id, email }, session: {} }, error: null };
        } catch (e) {
          const err = toError(e);
          return { data: { user: null, session: null }, error: { message: err.code === "23505" ? "User already registered" : err.message } };
        }
      },
      async signOut() { session?.set(null); current = { kind: "anon" }; return { error: null }; },
      async signInWithOAuth() { return { data: { url: null }, error: { message: "Login social indisponível na demonstração" } }; },
      async exchangeCodeForSession() { return { data: { user: null }, error: { message: "Indisponível na demonstração" } }; },
      admin: {
        async deleteUser(id: string) {
          const db = await getDemoDb();
          await db.query(`delete from auth.users where id = $1`, [id]);
          return { error: null };
        },
      },
    },
  };
  return client;
}
