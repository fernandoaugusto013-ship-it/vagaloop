"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";

const uuid = z.string().uuid();

export async function updateLead(form: FormData) {
  const { supabase, user } = await requireRole("admin");
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["novo", "em_contato", "qualificado", "ganho", "perdido"]).parse(form.get("status"));
  const assign = form.get("assign") === "me";
  await supabase.from("leads").update({ status, ...(assign ? { owner_id: user.id } : {}) }).eq("id", id);
  revalidatePath("/admin/leads");
}

export async function moderateJob(form: FormData) {
  const { supabase } = await requireRole("admin");
  const id = uuid.parse(form.get("id"));
  const status = z.enum(["suspensa", "publicada", "pausada"]).parse(form.get("status"));
  await supabase.from("jobs").update({ status }).eq("id", id);
  revalidatePath("/admin/vagas");
  revalidatePath("/vagas");
}

export async function verifyCompany(form: FormData) {
  const { supabase } = await requireRole("admin");
  const id = uuid.parse(form.get("id"));
  await supabase.from("companies").update({ is_verified: form.get("value") === "true" }).eq("id", id);
  revalidatePath("/admin/empresas");
}

export async function setUserRole(form: FormData) {
  const { supabase, user } = await requireRole("admin");
  const id = uuid.parse(form.get("id"));
  if (id === user.id) return; // não rebaixa a si mesmo por engano
  const role = z.enum(["admin", "company", "recruiter", "candidate"]).parse(form.get("role"));
  await supabase.from("profiles").update({ role }).eq("id", id);
  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "papel_alterado", entity: "profiles", entity_id: id, data: { para: role } });
  revalidatePath("/admin/usuarios");
}

export type SettingsState = { ok?: boolean; error?: string };

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const { supabase } = await requireRole("admin");
  const { data: current } = await supabase.from("settings").select("key, value");
  const updates: { key: string; value: unknown }[] = [];
  for (const row of current ?? []) {
    const raw = form.get(row.key);
    if (raw == null) continue;
    const text = String(raw).trim();
    let value: unknown;
    if (typeof row.value === "number") {
      const n = Number(text.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) return { error: `Valor inválido em ${row.key}` };
      if (row.key === "platform_split_pct" && n > 100) return { error: "O percentual precisa estar entre 0 e 100." };
      value = n;
    } else if (typeof row.value === "string") {
      value = text;
    } else {
      try { value = JSON.parse(text); } catch { return { error: `JSON inválido em ${row.key}` }; }
    }
    if (JSON.stringify(value) !== JSON.stringify(row.value)) updates.push({ key: row.key, value });
  }
  for (const u of updates) {
    const { error } = await supabase.from("settings").update({ value: u.value }).eq("key", u.key);
    if (error) return { error: `Não foi possível salvar ${u.key}` };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const faqSchema = z.object({
  scope: z.enum(["home", "contratar", "recrutadores", "candidatos"]),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(2000),
});

export async function addFaq(form: FormData) {
  const { supabase } = await requireRole("admin");
  const parsed = faqSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  await supabase.from("faqs").insert({ ...parsed.data, position: 99 });
  revalidatePath("/admin/conteudo");
  revalidatePath("/", "layout");
}

export async function deleteContent(form: FormData) {
  const { supabase } = await requireRole("admin");
  const table = z.enum(["faqs", "testimonials", "client_logos"]).parse(form.get("table"));
  await supabase.from(table).delete().eq("id", uuid.parse(form.get("id")));
  revalidatePath("/admin/conteudo");
  revalidatePath("/", "layout");
}

export async function togglePublished(form: FormData) {
  const { supabase } = await requireRole("admin");
  const table = z.enum(["faqs", "testimonials", "client_logos"]).parse(form.get("table"));
  await supabase.from(table).update({ is_published: form.get("value") === "true" }).eq("id", uuid.parse(form.get("id")));
  revalidatePath("/admin/conteudo");
  revalidatePath("/", "layout");
}

const testimonialSchema = z.object({
  author_name: z.string().trim().min(2).max(120),
  author_role: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  quote: z.string().trim().min(10).max(600),
  scope: z.enum(["home", "contratar", "recrutadores"]),
  consent: z.literal("on"),
});

/** Só depoimentos reais, com autorização de quem falou. */
export async function addTestimonial(form: FormData) {
  const { supabase } = await requireRole("admin");
  const parsed = testimonialSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const { consent: _c, ...t } = parsed.data;
  await supabase.from("testimonials").insert({ ...t, is_published: false });
  revalidatePath("/admin/conteudo");
}
