import { EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { MyApplications, type StatusRow } from "@/components/candidate/my-applications";
import { JobCard } from "@/components/jobs/job-card";
import { markNotificationsRead } from "@/app/actions/candidate";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import type { JobCardData } from "@/lib/public-data";

export default async function CandidatoHome({ searchParams }: { searchParams: Promise<{ enviada?: string }> }) {
  const { supabase, user, profile } = await requireRole("candidate");
  const { enviada } = await searchParams;
  const [{ data: rows }, { data: notes }, { data: cp }] = await Promise.all([
    supabase.from("application_status").select("*").eq("candidate_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("notifications").select("id, title, body, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("candidate_profiles").select("pref_work_modes, pref_contracts, uf, skills").eq("user_id", user.id).single(),
  ]);

  // Vagas recomendadas: preferências + habilidades (versão simples da Fase 1)
  let rec = supabase.from("jobs_public").select("id, slug, city_slug, title, contract_type, work_mode, city, uf, salary_min, salary_max, salary_period, salary_negotiable, sector, seniority, published_at, is_confidential, company_slug, company_name, company_logo_url, company_verified")
    .order("published_at", { ascending: false }).limit(4);
  if (cp?.pref_work_modes?.length) rec = rec.in("work_mode", cp.pref_work_modes);
  if (cp?.pref_contracts?.length) rec = rec.in("contract_type", cp.pref_contracts);
  if (cp?.skills?.length) rec = rec.textSearch("search", cp.skills.slice(0, 5).join(" | "), { type: "plain", config: "portuguese" });
  const applied = new Set((rows ?? []).map((r) => r.job_id));
  const { data: recJobs } = await rec;
  const recommended = ((recJobs ?? []) as JobCardData[]).filter((j) => !applied.has(j.id));
  const unread = (notes ?? []).filter((n) => !n.read_at).length;

  return (
    <>
      <PageHeader title={`Olá, ${profile.full_name.split(" ")[0] || "tudo bem"}!`} description="Acompanhe cada etapa das suas candidaturas em tempo real." actions={<ButtonLink href="/vagas">Buscar vagas</ButtonLink>} />
      {enviada ? <Notice tone="mint" className="mb-6" title="Candidatura enviada!">Você recebe um aviso aqui e por e-mail a cada mudança de etapa.</Notice> : null}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-label="Minhas candidaturas">
          {rows?.length ? <MyApplications initial={rows as StatusRow[]} userId={user.id} /> : (
            <EmptyState title="Nenhuma candidatura ainda" action={<ButtonLink href="/vagas">Ver vagas abertas</ButtonLink>}>Complete o perfil e candidate-se em poucos cliques.</EmptyState>
          )}
          {recommended.length ? (
            <div className="mt-10">
              <h2 className="mb-3 text-lg font-bold">Vagas para você</h2>
              <div className="grid gap-3">{recommended.map((j) => <JobCard key={j.id} job={j} />)}</div>
            </div>
          ) : null}
        </section>
        <aside>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold">Avisos</h2>{unread ? <form action={markNotificationsRead}><button className="text-xs font-semibold text-brand hover:underline">Marcar como lidos</button></form> : null}</div>
            <ul className="mt-3 space-y-3">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="text-sm">
                  <p className={n.read_at ? "font-medium" : "font-bold"}>{!n.read_at ? <span aria-label="não lido" className="mr-1.5 inline-block size-2 rounded-full bg-brand" /> : null}{n.title}</p>
                  {n.body ? <p className="text-muted">{n.body}</p> : null}
                  <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
                </li>
              ))}
              {!notes?.length ? <li className="text-sm text-muted">Sem avisos por enquanto.</li> : null}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
