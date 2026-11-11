import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Company, Profile, UserRole } from "@/lib/types";

export const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin",
  company: "/empresa",
  recruiter: "/recrutadora",
  candidate: "/candidato",
};

/** Usuário e perfil da requisição atual (memorizado por requisição). */
export const getSession = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, role, full_name, avatar_url").eq("id", user.id).single<Profile>();
  if (!profile) return null;
  return { user, profile, supabase };
});

export async function requireRole(...roles: UserRole[]) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (roles.length && !roles.includes(session.profile.role)) redirect(HOME_BY_ROLE[session.profile.role]);
  return session;
}

/** Empresa do usuário logado (a primeira, até termos troca de empresa na interface). */
export const getMyCompany = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const { data } = await session.supabase
    .from("company_members")
    .select("role, companies(*)")
    .eq("user_id", session.user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!data?.companies) return null;
  return { company: data.companies as unknown as Company, memberRole: data.role as "owner" | "member" };
});

/** Exige empresa cadastrada; sem ela, manda para o onboarding. */
export async function requireCompany() {
  const session = await requireRole("company", "admin");
  const mine = await getMyCompany();
  if (!mine) redirect("/empresa/onboarding");
  return { ...session, ...mine };
}
