import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { isDemo } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "E-mails da demonstração", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Na demo nenhum e-mail sai de verdade: esta página mostra a fila que seria enviada. */
export default async function DemoEmails() {
  if (!isDemo) notFound();
  const db = createAdminClient()!;
  const { data } = await db.from("email_outbox").select("id, to_email, subject, body, template_key, created_at").order("created_at", { ascending: false }).limit(60);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">E-mails da demonstração</h1>
      <p className="mt-2 text-muted">O que o sistema enviaria aos candidatos a cada mudança de etapa. Nenhum e-mail sai de verdade na demo.</p>
      <div className="mt-8 space-y-4">
        {data?.length ? data.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted"><Badge>{m.template_key}</Badge><span>para {m.to_email}</span><span className="ml-auto">{formatDateTime(m.created_at)}</span></div>
            <p className="mt-2 font-bold">{m.subject}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{m.body}</p>
          </Card>
        )) : <EmptyState title="Nenhum e-mail ainda" />}
      </div>
    </div>
  );
}
