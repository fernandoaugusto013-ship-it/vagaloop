export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Modo demonstração: banco embutido com dados fictícios, sem Supabase.
 * Liga com NEXT_PUBLIC_DEMO_MODE=1. Nunca use em produção com dados reais.
 */
export const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

/** Há um backend disponível (Supabase real ou o banco da demo). */
export const isSupabaseConfigured = isDemo || Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
