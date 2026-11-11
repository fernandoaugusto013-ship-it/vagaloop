import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function toHtml(body: string) {
  const linked = escape(body).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#6d28d9">$1</a>');
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.6;color:#1c1830;max-width:560px">
  <p style="font-weight:700;color:#6d28d9;font-size:18px;margin:0 0 16px">VagaLoop</p>
  ${linked.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`).join("")}
  <p style="font-size:12px;color:#77738a;margin-top:28px">Você recebeu este e-mail porque tem uma candidatura ou conta na VagaLoop. Gerencie suas preferências na área logada.</p>
</div>`;
}

export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "sem_provedor" as const };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "VagaLoop <nao-responda@vagaloop.com.br>", to: [to], subject, text, html: toHtml(text) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return { status: "erro" as const, error: (await res.text()).slice(0, 500) };
  return { status: "enviado" as const };
}

/** Envia o que estiver pendente na fila. Os gatilhos do banco enfileiram; aqui só despachamos. */
export async function processOutbox(limit = 20) {
  const db = createAdminClient();
  if (!db) return 0;
  const { data: items } = await db.from("email_outbox").select("id, to_email, subject, body, attempts")
    .in("status", ["pendente", "erro"]).lt("attempts", 5).order("created_at").limit(limit);
  let sent = 0;
  for (const item of items ?? []) {
    if (!item.to_email) continue;
    const r = await sendEmail(item.to_email, item.subject, item.body);
    await db.from("email_outbox").update({
      status: r.status, attempts: item.attempts + 1, error: "error" in r ? r.error : null,
      sent_at: r.status === "enviado" ? new Date().toISOString() : null,
    }).eq("id", item.id);
    if (r.status === "enviado") sent++;
  }
  return sent;
}
