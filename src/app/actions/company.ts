"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getMyCompany, requireCompany, requireRole } from "@/lib/auth";
import { isValidCnpj } from "@/lib/cnpj";
import { COMPANY_SIZES, UFS } from "@/lib/constants";
import { SITE_URL } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export type FormState = { ok?: boolean; error?: string; errors?: Record<string, string>; message?: string };

const opt = z.string().trim().max(2000).optional().transform((v) => v || null);
const companySchema = z.object({
  cnpj: z.string().optional().transform((v) => (v ? v.replace(/\D/g, "") : null))
    .refine((v) => !v || isValidCnpj(v), "CNPJ inválido"),
  name: z.string().trim().min(2, "Informe o nome da empresa").max(120),
  legal_name: opt,
  size: z.enum(COMPANY_SIZES).optional().or(z.literal("")).transform((v) => v || null),
  sector: opt,
  city: opt,
  uf: z.enum(UFS).optional().or(z.literal("")).transform((v) => v || null),
  website: z.string().trim().optional().transform((v) => (v ? (/^https?:\/\//.test(v) ? v : `https://${v}`) : null))
    .refine((v) => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/.test(v), "Site inválido"),
  description: opt,
  culture: opt,
});

function issues(err: z.ZodError) {
  const errors: Record<string, string> = {};
  for (const i of err.issues) errors[String(i.path[0])] ??= i.message;
  return errors;
}

export async function createCompany(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireRole("company");
  if (await getMyCompany()) redirect("/empresa");
  const parsed = companySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Confira os campos destacados.", errors: issues(parsed.error) };
  const { error } = await supabase.from("companies").insert(parsed.data);
  if (error) {
    if (error.code === "23505") return { error: "Este CNPJ já está cadastrado. Peça um convite a quem administra a conta da empresa.", errors: { cnpj: "CNPJ já cadastrado" } };
    return { error: "Não foi possível salvar. Tente novamente." };
  }
  redirect("/empresa/vagas/nova");
}

export async function updateCompany(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, company, memberRole } = await requireCompany();
  if (memberRole !== "owner") return { error: "Só quem administra a empresa pode editar o perfil." };
  const parsed = companySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Confira os campos destacados.", errors: issues(parsed.error) };

  const logo = form.get("logo");
  let logo_url: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2 * 1024 * 1024) return { error: "O logo pode ter até 2 MB.", errors: { logo: "Arquivo grande demais" } };
    if (!["image/png", "image/jpeg", "image/webp"].includes(logo.type)) return { error: "Use PNG, JPG ou WebP.", errors: { logo: "Formato não aceito" } };
    const path = `${company.id}/logo-${Date.now()}.${logo.type.split("/")[1]}`;
    const up = await supabase.storage.from("logos").upload(path, logo, { contentType: logo.type, upsert: true });
    if (up.error) return { error: "Não foi possível enviar o logo." };
    logo_url = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await supabase.from("companies").update({ ...parsed.data, ...(logo_url ? { logo_url } : {}) }).eq("id", company.id);
  if (error) return { error: error.code === "23505" ? "CNPJ já usado por outra conta." : "Não foi possível salvar." };
  revalidatePath("/empresa", "layout");
  return { ok: true, message: "Perfil atualizado." };
}

export async function inviteMember(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, company, memberRole } = await requireCompany();
  if (memberRole !== "owner") return { error: "Só quem administra a empresa pode convidar." };
  const email = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!email.success) return { error: "E-mail inválido.", errors: { email: "E-mail inválido" } };
  const role = form.get("role") === "owner" ? "owner" : "member";
  const { data, error } = await supabase.from("company_invites").insert({ company_id: company.id, email: email.data, role }).select("token").single();
  if (error || !data) return { error: "Não foi possível criar o convite." };

  const link = `${SITE_URL}/convite/${data.token}`;
  const admin = createAdminClient();
  let sent = false;
  if (admin) {
    const { data: tpl } = await admin.rpc("render_template", { template_key: "convite_empresa", cid: company.id, vars: { empresa: company.name, link } });
    const t = Array.isArray(tpl) ? tpl[0] : tpl;
    if (t?.subject) sent = (await sendEmail(email.data, t.subject, t.body)).status === "enviado";
  }
  revalidatePath("/empresa/equipe");
  return { ok: true, message: sent ? `Convite enviado para ${email.data}.` : `Convite criado. Envie este link para ${email.data}: ${link}` };
}

export async function revokeInvite(form: FormData) {
  const { supabase } = await requireCompany();
  await supabase.from("company_invites").delete().eq("id", String(form.get("id")));
  revalidatePath("/empresa/equipe");
}

export async function removeMember(form: FormData) {
  const { supabase, company, user } = await requireCompany();
  const uid = String(form.get("user_id"));
  if (uid === user.id) return;
  await supabase.from("company_members").delete().eq("company_id", company.id).eq("user_id", uid);
  revalidatePath("/empresa/equipe");
}
