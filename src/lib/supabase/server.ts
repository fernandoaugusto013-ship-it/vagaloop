import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isDemo, isSupabaseConfigured } from "@/lib/env";

export const DEMO_COOKIE = "vagaloop_demo_sessao";

/** Cliente com a sessão do usuário (respeita RLS). */
export async function createClient() {
  if (!isSupabaseConfigured) throw new Error("Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  const cookieStore = await cookies();
  if (isDemo) {
    const { createDemoClient } = await import("@/lib/demo/client");
    return createDemoClient({
      get: () => cookieStore.get(DEMO_COOKIE)?.value ?? null,
      set: (id) => {
        try {
          if (id) cookieStore.set(DEMO_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
          else cookieStore.delete(DEMO_COOKIE);
        } catch { /* Server Component: cookies só mudam em actions/rotas */ }
      },
    }) as unknown as ReturnType<typeof realClient>;
  }
  return realClient(cookieStore);
}

function realClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado de um Server Component: o proxy renova a sessão
        }
      },
    },
  });
}

/** Para leituras públicas: devolve null quando não há backend configurado. */
export async function createPublicClient() {
  return isSupabaseConfigured ? createClient() : null;
}
