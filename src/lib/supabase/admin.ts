import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, isDemo } from "@/lib/env";
import { createDemoClient } from "@/lib/demo/client";

/**
 * Cliente service_role: ignora RLS. Usar SOMENTE no servidor e para tarefas do sistema
 * (score de IA, envio de e-mails, exclusão de conta). Nunca para ler dados em nome do usuário.
 */
export function createAdminClient(): SupabaseClient | null {
  if (isDemo) return createDemoClient(null, true) as unknown as SupabaseClient;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
