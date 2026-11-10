import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processOutbox } from "@/lib/email";
import { scoreApplication } from "@/lib/scoring";

export const maxDuration = 60;

/**
 * Rede de segurança (agendada pelo vercel.json): reenvia e-mails pendentes e calcula scores
 * que não terminaram logo após a candidatura. Protegida por CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "service role ausente" }, { status: 500 });

  const sent = await processOutbox(50);
  const { data: pending } = await db.from("applications").select("id")
    .in("ai_status", ["pendente", "erro"]).lt("created_at", new Date(Date.now() - 2 * 60_000).toISOString()).limit(10);
  let scored = 0;
  for (const a of pending ?? []) if ((await scoreApplication(a.id)).ok) scored++;
  return NextResponse.json({ emails_enviados: sent, scores_calculados: scored });
}
