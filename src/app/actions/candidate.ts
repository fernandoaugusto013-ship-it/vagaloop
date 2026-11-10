"use server";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText, parseResume, sniffMime } from "@/lib/ai/resume";
import { scoreApplication } from "@/lib/scoring";
import { processOutbox } from "@/lib/email";
import { CONTRACT_TYPES, TERMS_VERSION, UFS, WORK_MODES } from "@/lib/constants";

const MAX_CV = 5 * 1024 * 1024;

export type UploadState = { ok?: boolean; error?: string; message?: string };

export async function uploadResume(_: UploadState, form: FormData): Promise<UploadState> {
  const { supabase, user } = await requireRole("candidate");
  const file = form.get("cv");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha um arquivo PDF ou DOCX." };
  if (file.size > MAX_CV) return { error: "O arquivo pode ter até 5 MB." };
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime) return { error: "Formato não aceito. Envie PDF ou DOCX." };

  const ext = mime === "application/pdf" ? "pdf" : "docx";
  const path = `${user.id}/cv-${Date.now()}.${ext}`;
  const up = await supabase.storage.from("resumes").upload(path, file, { contentType: mime });
  if (up.error) return { error: "Não foi possível enviar o arquivo." };

  await supabase.from("resumes").update({ is_primary: false }).eq("user_id", user.id);
  const { data: row, error } = await supabase.from("resumes")
    .insert({ user_id: user.id, storage_path: path, file_name: file.name.slice(0, 200), mime_type: mime, size_bytes: file.size, is_primary: true })
    .select("id").single();
  if (error || !row) return { error: "Arquivo enviado, mas não conseguimos registrar. Tente de novo." };

  let text = "";
  try { text = await extractText(file, mime); } catch { /* PDF de imagem ou corrompido */ }
  if (text.trim().length < 80) {
    return { ok: true, message: "Currículo salvo. Não conseguimos ler o texto (talvez seja uma imagem escaneada): preencha o perfil abaixo." };
  }

  const parsed = await parseResume(text);
  await supabase.from("resumes").update({ parsed: parsed.profile, parsed_at: new Date().toISOString() }).eq("id", row.id);

  // Preenche só o que estiver vazio: nunca apaga o que a pessoa já escreveu.
  const { data: cur } = await supabase.from("candidate_profiles").select("*").eq("user_id", user.id).single();
  if (cur) {
    const fill = <T,>(current: T, next: T) => (current == null || (Array.isArray(current) && current.length === 0) || current === "" ? next : current);
    await supabase.from("candidate_profiles").update({
      headline: fill(cur.headline, parsed.profile.headline),
      summary: fill(cur.summary, parsed.profile.summary),
      city: fill(cur.city, parsed.profile.city),
      uf: fill(cur.uf, parsed.profile.uf && (UFS as readonly string[]).includes(parsed.profile.uf) ? parsed.profile.uf : null),
      skills: [...new Set([...(cur.skills ?? []), ...parsed.profile.skills])].slice(0, 40),
      experiences: fill(cur.experiences, parsed.profile.experiences),
      education: fill(cur.education, parsed.profile.education),
      languages: fill(cur.languages, parsed.profile.languages),
      links: fill(cur.links, parsed.profile.links),
      embedding: null, // recalculado no próximo match
    }).eq("user_id", user.id);
  }
  const { data: contact } = await supabase.from("candidate_contacts").select("phone, linkedin_url").eq("user_id", user.id).single();
  if (contact) {
    await supabase.from("candidate_contacts").update({
      phone: contact.phone || parsed.contact.phone,
      linkedin_url: contact.linkedin_url || parsed.contact.linkedin_url,
    }).eq("user_id", user.id);
  }
  revalidatePath("/candidato/perfil");
  return { ok: true, message: parsed.mode === "ia" ? "Pronto! Lemos seu currículo e preenchemos o perfil. Confira e ajuste." : "Currículo salvo e algumas informações preenchidas. Complete o restante do perfil." };
}

const exp = z.object({ empresa: z.string().trim().max(120), cargo: z.string().trim().max(120), inicio: z.string().max(10).optional(), fim: z.string().max(10).optional(), descricao: z.string().trim().max(1500).optional() });
const edu = z.object({ instituicao: z.string().trim().max(160), curso: z.string().trim().max(160), nivel: z.string().max(60).optional(), inicio: z.string().max(10).optional(), fim: z.string().max(10).optional() });
const profileSchema = z.object({
  full_name: z.string().trim().min(3).max(120),
  headline: z.string().trim().max(160).nullable(),
  summary: z.string().trim().max(3000).nullable(),
  city: z.string().trim().max(80).nullable(),
  uf: z.enum(UFS).nullable(),
  salary_expectation: z.number().nonnegative().max(1_000_000).nullable(),
  skills: z.array(z.string().trim().min(1).max(60)).max(40),
  experiences: z.array(exp).max(20),
  education: z.array(edu).max(15),
  languages: z.array(z.object({ idioma: z.string().trim().min(1).max(40), nivel: z.string().trim().max(40) })).max(10),
  links: z.array(z.object({ rotulo: z.string().trim().max(40), url: z.string().trim().url().max(300) })).max(8),
  is_pcd: z.boolean(),
  pcd_details: z.string().trim().max(300).nullable(),
  pref_work_modes: z.array(z.enum(Object.keys(WORK_MODES) as [keyof typeof WORK_MODES])).max(3),
  pref_contracts: z.array(z.enum(Object.keys(CONTRACT_TYPES) as [keyof typeof CONTRACT_TYPES])).max(5),
  pref_cities: z.array(z.string().trim().min(1).max(80)).max(10),
  phone: z.string().trim().max(30).nullable(),
  whatsapp: z.string().trim().max(30).nullable(),
  linkedin_url: z.string().trim().max(300).nullable(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export async function saveProfile(input: ProfileInput) {
  const { supabase, user } = await requireRole("candidate");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: `Confira o campo: ${parsed.error.issues[0].path.join(".")}` };
  const { full_name, phone, whatsapp, linkedin_url, ...profile } = parsed.data;
  const results = await Promise.all([
    supabase.from("profiles").update({ full_name }).eq("id", user.id),
    supabase.from("candidate_profiles").update({ ...profile, pcd_details: profile.is_pcd ? profile.pcd_details : null, embedding: null }).eq("user_id", user.id),
    supabase.from("candidate_contacts").update({ phone, whatsapp, linkedin_url }).eq("user_id", user.id),
  ]);
  if (results.some((r) => r.error)) return { ok: false as const, error: "Não foi possível salvar." };
  revalidatePath("/candidato/perfil");
  return { ok: true as const };
}

const applySchema = z.object({
  job_id: z.string().uuid(),
  answers: z.array(z.object({ question_id: z.string().uuid(), answer: z.string().trim().max(1000) })).max(10),
  cover_letter: z.string().trim().max(3000).optional(),
  consent: z.literal(true, { message: "É preciso autorizar o uso dos seus dados nesta candidatura." }),
});

export async function applyToJob(input: z.input<typeof applySchema>) {
  const { supabase, user } = await requireRole("candidate");
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { job_id, answers, cover_letter } = parsed.data;

  await supabase.from("consents").insert({ user_id: user.id, purpose: "tratamento_dados_candidatura", version: TERMS_VERSION, granted: true });
  // sem .select(): o candidato não lê a tabela applications (só application_status)
  const { error } = await supabase.from("applications").insert({ job_id, candidate_id: user.id, answers, cover_letter: cover_letter || null });
  if (error) {
    if (error.code === "23505") return { ok: false as const, error: "Você já se candidatou a esta vaga." };
    return { ok: false as const, error: "Não foi possível enviar. A vaga pode ter sido encerrada." };
  }

  after(async () => {
    const admin = createAdminClient();
    if (!admin) return;
    const { data } = await admin.from("applications").select("id").eq("job_id", job_id).eq("candidate_id", user.id).single();
    if (data) await scoreApplication(data.id);
    await processOutbox();
  });
  revalidatePath("/candidato");
  return { ok: true as const };
}

export async function markNotificationsRead() {
  const { supabase, user } = await requireRole("candidate");
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/candidato");
}

export async function deleteMyAccount(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await requireRole("candidate");
  if (String(form.get("confirm")).trim().toUpperCase() !== "EXCLUIR") return { error: "Digite EXCLUIR para confirmar." };
  const admin = createAdminClient();
  if (!admin) return { error: "Exclusão indisponível no momento. Escreva para o encarregado de dados." };
  const { data: files } = await admin.storage.from("resumes").list(user.id, { limit: 100 });
  if (files?.length) await admin.storage.from("resumes").remove(files.map((f) => `${user.id}/${f.name}`));
  // apaga auth.users → cascata em profiles, perfil, contato, CVs, candidaturas, consentimentos
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Não foi possível excluir agora. Tente de novo." };
  await supabase.auth.signOut();
  redirect("/?conta=excluida");
}
