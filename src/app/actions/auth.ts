"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL, isDemo, isSupabaseConfigured } from "@/lib/env";
import { safePath } from "@/lib/safe-redirect";
import { TERMS_VERSION } from "@/lib/constants";

export type AuthState = { error?: string; info?: string; fields?: Record<string, string> };

const HOME: Record<string, string> = { admin: "/admin", company: "/empresa", recruiter: "/recrutadora", candidate: "/candidato" };

function friendly(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered|already exists/i.test(msg)) return "Já existe uma conta com este e-mail. Tente entrar.";
  if (/rate limit|too many/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/password/i.test(msg)) return "A senha precisa ter pelo menos 8 caracteres.";
  return "Não foi possível concluir agora. Tente novamente.";
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "Login indisponível: Supabase não configurado." };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message), fields: { email } };
  const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(safePath(String(form.get("voltar") ?? ""), HOME[p?.role ?? "candidate"]));
}

const signUpSchema = z.object({
  perfil: z.enum(["company", "candidate", "recruiter"]),
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(72),
  terms: z.literal("on", { message: "Aceite os Termos e a Política de Privacidade para continuar" }),
});

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "Cadastro indisponível: Supabase não configurado." };
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  const fields = { full_name: String(form.get("full_name") ?? ""), email: String(form.get("email") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const { perfil, full_name, email, password } = parsed.data;
  const voltar = safePath(String(form.get("voltar") ?? ""), HOME[perfil]);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { role: perfil, full_name, terms_version: TERMS_VERSION },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(voltar)}`,
    },
  });
  if (error) return { error: friendly(error.message), fields };
  if (!data.session) return { info: `Enviamos um link de confirmação para ${email}. Abra o e-mail para ativar sua conta.` };
  redirect(voltar);
}

export async function signInWithProvider(form: FormData) {
  const provider = form.get("provider") === "linkedin_oidc" ? "linkedin_oidc" : "google";
  const perfil = String(form.get("perfil") ?? "");
  const next = safePath(String(form.get("voltar") ?? ""), "");
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? SITE_URL;
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (["company", "recruiter"].includes(perfil)) params.set("perfil", perfil);
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${origin}/auth/callback?${params}` } });
  if (error || !data.url) redirect("/entrar?erro=oauth");
  redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

/** Só no modo demonstração: entra com um usuário fictício em um clique. */
export async function demoLogin(form: FormData) {
  if (!isDemo) redirect("/entrar");
  const email = String(form.get("email") ?? "");
  if (!/@(vagaloop|exemplo)\.dev$/.test(email)) redirect("/entrar");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: "demo12345" });
  if (error || !data.user) redirect("/entrar");
  const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(safePath(String(form.get("voltar") ?? ""), HOME[p?.role ?? "candidate"]));
}
