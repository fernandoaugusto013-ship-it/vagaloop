"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { UFS } from "@/lib/constants";

export type LeadState = { ok: boolean; message: string; errors?: Record<string, string> };

const schema = z.object({
  type: z.enum(["contratar", "recrutadora"]),
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(160),
  whatsapp: z.string().trim().regex(/^[\d\s()+-]{10,20}$/, "WhatsApp com DDD, só números").optional().or(z.literal("")),
  company_name: z.string().trim().max(120).optional(),
  company_size: z.string().trim().max(20).optional(),
  hires_count: z.string().trim().max(20).optional(),
  city: z.string().trim().max(80).optional(),
  uf: z.enum(UFS).optional().or(z.literal("")),
  consent: z.literal("on", { message: "É preciso concordar com a Política de Privacidade" }),
});

export async function submitLead(_prev: LeadState, form: FormData): Promise<LeadState> {
  // honeypot: robôs preenchem campos escondidos
  if (form.get("site")) return { ok: true, message: "Recebido! Entraremos em contato." };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Confira os campos destacados.", errors };
  }
  if (!isSupabaseConfigured) return { ok: false, message: "Formulário indisponível no momento. Tente mais tarde." };
  const { consent: _c, ...lead } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    ...lead, whatsapp: lead.whatsapp || null, uf: lead.uf || null,
  });
  if (error) return { ok: false, message: "Não conseguimos enviar agora. Tente de novo em instantes." };
  return {
    ok: true,
    message: lead.type === "contratar"
      ? "Recebido! Uma especialista da VagaLoop fala com você em até 1 dia útil."
      : "Recebido! Vamos te enviar os próximos passos do programa por e-mail.",
  };
}
