import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safePath } from "@/lib/safe-redirect";
import { TERMS_VERSION } from "@/lib/constants";

const HOME: Record<string, string> = { admin: "/admin", company: "/empresa", recruiter: "/recrutadora", candidate: "/candidato" };

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/entrar?erro=link", url));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/entrar?erro=link", url));

  let { data: profile } = await supabase.from("profiles").select("role, created_at").eq("id", data.user.id).single();

  // Cadastro via Google/LinkedIn não carrega o perfil escolhido: ajustamos só em conta recém-criada.
  const wanted = url.searchParams.get("perfil");
  const isNew = profile && Date.now() - new Date(profile.created_at).getTime() < 10 * 60_000;
  const admin = createAdminClient();
  if (isNew && admin) {
    // o botão social fica abaixo do aviso "ao continuar, você aceita os Termos": registramos o aceite
    const { count } = await admin.from("consents").select("id", { count: "exact", head: true }).eq("user_id", data.user.id);
    if (!count) {
      await admin.from("consents").insert({ user_id: data.user.id, purpose: "termos_e_privacidade", version: TERMS_VERSION, granted: true,
        user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null });
    }
  }
  if (profile && profile.role === "candidate" && (wanted === "company" || wanted === "recruiter") && isNew) {
    if (admin) {
      await admin.from("profiles").update({ role: wanted }).eq("id", data.user.id);
      if (wanted === "recruiter") await admin.from("recruiter_profiles").upsert({ user_id: data.user.id });
      profile = { ...profile, role: wanted };
    }
  }

  const next = safePath(url.searchParams.get("next"), HOME[profile?.role ?? "candidate"]);
  return NextResponse.redirect(new URL(next, url));
}
