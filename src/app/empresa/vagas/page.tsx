import Link from "next/link";
import { Badge, EmptyState, Notice, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { setJobStatus } from "@/app/actions/jobs";
import { requireCompany } from "@/lib/auth";
import { CONTRACT_TYPES, WORK_MODES } from "@/lib/constants";
import { formatDate } from "@/lib/format";

const STATUS: Record<string, { label: string; tone: "mint" | "neutral" | "amber" | "danger" }> = {
  publicada: { label: "Publicada", tone: "mint" }, rascunho: { label: "Rascunho", tone: "neutral" },
  pausada: { label: "Pausada", tone: "amber" }, encerrada: { label: "Encerrada", tone: "neutral" }, suspensa: { label: "Suspensa", tone: "danger" },
};

export default async function VagasEmpresa({ searchParams }: { searchParams: Promise<{ publicada?: string }> }) {
  const { supabase, company } = await requireCompany();
  const { publicada } = await searchParams;
  const { data: jobs } = await supabase.from("jobs")
    .select("id, title, status, contract_type, work_mode, city, uf, slug, city_slug, published_at, created_at, is_confidential, applications(count)")
    .eq("company_id", company.id).order("created_at", { ascending: false });
  const justPublished = jobs?.find((j) => j.id === publicada);

  return (
    <>
      <PageHeader title="Vagas" actions={<ButtonLink href="/empresa/vagas/nova">Nova vaga</ButtonLink>} />
      {justPublished ? (
        <Notice tone="mint" title="Vaga publicada!" className="mb-6">
          “{justPublished.title}” já está no ar. <Link href={`/vagas/${justPublished.city_slug}/${justPublished.slug}`} className="font-semibold underline">Ver página pública</Link>
        </Notice>
      ) : null}
      {!jobs?.length ? (
        <EmptyState title="Nenhuma vaga ainda" action={<ButtonLink href="/empresa/vagas/nova/lia">Criar com a Lia</ButtonLink>}>Publique a primeira em poucos minutos, de graça.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-muted"><tr><th className="p-4 font-semibold">Vaga</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Candidatos</th><th className="p-4 font-semibold">Publicação</th><th className="p-4"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {jobs.map((j) => {
                const count = (j.applications as unknown as { count: number }[])[0]?.count ?? 0;
                const st = STATUS[j.status];
                return (
                  <tr key={j.id}>
                    <td className="p-4">
                      <Link href={`/empresa/vagas/${j.id}/pipeline`} className="font-bold text-ink hover:text-brand">{j.title}</Link>
                      <p className="text-muted">{CONTRACT_TYPES[j.contract_type as keyof typeof CONTRACT_TYPES]} · {WORK_MODES[j.work_mode as keyof typeof WORK_MODES]}{j.city ? ` · ${j.city}/${j.uf}` : ""}{j.is_confidential ? " · confidencial" : ""}</p>
                    </td>
                    <td className="p-4"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="p-4 font-semibold">{count}</td>
                    <td className="p-4 text-muted">{j.published_at ? formatDate(j.published_at) : "—"}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-3 font-semibold">
                        <Link href={`/empresa/vagas/${j.id}/pipeline`} className="text-brand hover:underline">Pipeline</Link>
                        <Link href={`/empresa/vagas/${j.id}/editar`} className="hover:underline">Editar</Link>
                        {j.status === "publicada" ? <StatusButton id={j.id} status="pausada" label="Pausar" /> : null}
                        {j.status === "pausada" || j.status === "rascunho" ? <StatusButton id={j.id} status="publicada" label="Publicar" /> : null}
                        {j.status !== "encerrada" && j.status !== "suspensa" ? <StatusButton id={j.id} status="encerrada" label="Encerrar" /> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setJobStatus}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <button className="text-muted hover:text-ink hover:underline">{label}</button>
    </form>
  );
}
