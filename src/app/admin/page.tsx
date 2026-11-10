import { Card, Notice, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";

export default async function AdminHome() {
  const { supabase } = await requireRole("admin");
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);
  const [jobs, jobs30, apps, apps30, companies, candidates, leadsNew, hiredRows, outboxErr] = await Promise.all([
    count(supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "publicada")),
    count(supabase.from("jobs").select("id", { count: "exact", head: true }).gte("published_at", since)),
    count(supabase.from("applications").select("id", { count: "exact", head: true })),
    count(supabase.from("applications").select("id", { count: "exact", head: true }).gte("created_at", since)),
    count(supabase.from("companies").select("id", { count: "exact", head: true })),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "candidate")),
    count(supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "novo")),
    supabase.from("applications").select("created_at, hired_at").not("hired_at", "is", null).limit(2000),
    count(supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "erro")),
  ]);
  const hired = hiredRows.data ?? [];
  const avg = hired.length ? Math.round(hired.reduce((s, a) => s + (new Date(a.hired_at!).getTime() - new Date(a.created_at).getTime()), 0) / hired.length / 86_400_000) : null;

  const cards: [string, string | number, string?][] = [
    ["Vagas publicadas agora", jobs, `${jobs30} nos últimos 30 dias`],
    ["Candidaturas", apps, `${apps30} nos últimos 30 dias`],
    ["Contratações", hired.length, avg == null ? undefined : `${avg} dias em média`],
    ["Empresas", companies],
    ["Candidatos", candidates],
    ["Leads novos", leadsNew],
    ["MRR", "—", "assinaturas na Fase 3"],
    ["NPS", "—", "pesquisa na Fase 2"],
  ];
  return (
    <>
      <PageHeader title="Métricas da plataforma" />
      {outboxErr ? <Notice tone="amber" className="mb-6">{outboxErr} e-mail(s) com erro de envio. Confira RESEND_API_KEY e o domínio remetente.</Notice> : null}
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([l, v, sub]) => (
          <Card key={l} className="p-5"><dt className="text-sm text-muted">{l}</dt><dd className="mt-1 text-3xl font-extrabold tracking-tight">{v}</dd>{sub ? <dd className="mt-1 text-xs text-muted">{sub}</dd> : null}</Card>
        ))}
      </dl>
    </>
  );
}
