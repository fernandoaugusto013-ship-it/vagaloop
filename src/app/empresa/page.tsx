import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { requireCompany } from "@/lib/auth";

const FUNNEL = ["inscritos", "triagem", "teste", "entrevista", "finalistas", "proposta", "contratado"];
const LABEL: Record<string, string> = { inscritos: "Inscritos", triagem: "Triagem", teste: "Teste", entrevista: "Entrevista", finalistas: "Finalistas", proposta: "Proposta", contratado: "Contratados", reprovado: "Reprovados", custom: "Outras etapas" };
const SOURCE: Record<string, string> = { plataforma: "VagaLoop", manual: "Adicionados pelo time", indicacao: "Indicação" };

export default async function EmpresaDashboard() {
  const { supabase, company, profile } = await requireCompany();
  const { data: jobs } = await supabase.from("jobs").select("id, status").eq("company_id", company.id);
  const ids = (jobs ?? []).map((j) => j.id);
  const { data: apps } = ids.length
    ? await supabase.from("applications").select("id, source, created_at, hired_at, pipeline_stages(kind, position)").in("job_id", ids)
    : { data: [] };

  const active = (jobs ?? []).filter((j) => j.status === "publicada").length;
  const byKind: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const a of apps ?? []) {
    const k = (a.pipeline_stages as unknown as { kind: string } | null)?.kind ?? "inscritos";
    byKind[k] = (byKind[k] ?? 0) + 1;
    bySource[a.source] = (bySource[a.source] ?? 0) + 1;
  }
  const hired = (apps ?? []).filter((a) => a.hired_at);
  const avgDays = hired.length ? Math.round(hired.reduce((s, a) => s + (new Date(a.hired_at!).getTime() - new Date(a.created_at).getTime()), 0) / hired.length / 86_400_000) : null;
  // funil: quantos chegaram pelo menos até cada etapa (pela etapa atual; reprovados contam só em Inscritos)
  const reached = FUNNEL.map((k, i) => ({ k, n: FUNNEL.slice(i).reduce((s, kk) => s + (byKind[kk] ?? 0), 0) + (i === 0 ? (byKind.reprovado ?? 0) + (byKind.custom ?? 0) : 0) }));
  const max = Math.max(1, reached[0].n);

  if (!ids.length) {
    return (
      <>
        <PageHeader title={`Olá, ${profile.full_name.split(" ")[0]}!`} />
        <EmptyState title="Publique sua primeira vaga" action={<ButtonLink href="/empresa/vagas/nova/lia">Criar com a Lia</ButtonLink>}>A Lia monta a vaga numa conversa de 2 minutos. Publicar é grátis.</EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Visão geral" description={company.name} actions={<ButtonLink href="/empresa/vagas/nova">Nova vaga</ButtonLink>} />
      <dl className="grid gap-4 sm:grid-cols-4">
        {[["Vagas ativas", active], ["Candidaturas", apps?.length ?? 0], ["Contratações", hired.length], ["Tempo médio até contratar", avgDays == null ? "—" : `${avgDays} dias`]].map(([l, v]) => (
          <Card key={l as string} className="p-5"><dt className="text-sm text-muted">{l}</dt><dd className="mt-1 text-3xl font-extrabold tracking-tight">{v}</dd></Card>
        ))}
      </dl>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-bold">Funil de conversão</h2>
          <p className="text-sm text-muted">Candidatos que chegaram pelo menos até cada etapa.</p>
          <ul className="mt-5 space-y-3">
            {reached.map(({ k, n }) => (
              <li key={k} className="grid grid-cols-[110px_1fr_48px] items-center gap-3 text-sm">
                <span className="font-semibold">{LABEL[k]}</span>
                <span className="h-3 rounded-full bg-surface-2"><span className="block h-full rounded-full bg-brand" style={{ width: `${(n / max) * 100}%` }} /></span>
                <span className="text-right font-bold">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="font-bold">Candidatos por etapa agora</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => <li key={k} className="flex justify-between rounded-lg bg-surface-2 px-3 py-2"><span>{LABEL[k] ?? k}</span><strong>{n}</strong></li>)}
            </ul>
          </Card>
          <Card>
            <h2 className="font-bold">Fontes</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(bySource).map(([k, n]) => <li key={k} className="flex justify-between"><span>{SOURCE[k] ?? k}</span><strong>{n}</strong></li>)}
            </ul>
          </Card>
          <Card>
            <h2 className="font-bold">Processos com especialista</h2>
            <p className="mt-1 text-sm text-muted">Nenhum em andamento. <Link href="/quero-contratar" className="font-semibold text-brand hover:underline">Saiba como funciona</Link></p>
          </Card>
        </div>
      </div>
    </>
  );
}
