import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { moderateJob } from "@/app/actions/admin";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";

/** Sinais simples de vaga suspeita para priorizar a moderação. */
function flags(j: { title: string; description: string; salary_max: number | null; salary_min: number | null }) {
  const t = `${j.title} ${j.description}`.toLowerCase();
  const f: string[] = [];
  if (/taxa|pagamento antecipado|investimento inicial|pix para|curso obrigat/.test(t)) f.push("cobrança do candidato");
  if (/boa apar[eê]ncia|idade (m[aá]xima|entre)|sexo (masculino|feminino)|solteir/.test(t)) f.push("requisito discriminatório");
  if ((j.salary_max ?? j.salary_min ?? 0) > 100000) f.push("salário fora do padrão");
  if (/whatsapp|wa\.me|telegram/.test(t)) f.push("contato fora da plataforma");
  return f;
}

export default async function AdminVagas({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireRole("admin");
  const { q } = await searchParams;
  let query = supabase.from("jobs").select("id, title, status, slug, city_slug, description, salary_min, salary_max, is_confidential, published_at, companies(name)").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const { data: jobs } = await query;
  const rows = (jobs ?? []).map((j) => ({ ...j, flags: flags(j) })).sort((a, b) => b.flags.length - a.flags.length);
  return (
    <>
      <PageHeader title="Vagas e moderação" description="Vagas com sinais de risco aparecem primeiro." />
      <form className="mb-4"><Input name="q" defaultValue={q} placeholder="Buscar por título" className="max-w-sm" /></form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line text-muted"><tr><th className="p-3">Vaga</th><th className="p-3">Empresa</th><th className="p-3">Status</th><th className="p-3">Sinais</th><th className="p-3">Ação</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((j) => (
              <tr key={j.id}>
                <td className="p-3"><p className="font-semibold">{j.title}</p><p className="text-xs text-muted">{j.published_at ? formatDate(j.published_at) : "não publicada"}{j.status === "publicada" ? <> · <Link href={`/vagas/${j.city_slug}/${j.slug}`} className="text-brand">ver</Link></> : null}</p></td>
                <td className="p-3">{(j.companies as unknown as { name: string } | null)?.name}{j.is_confidential ? <Badge className="ml-2">confidencial</Badge> : null}</td>
                <td className="p-3"><Badge tone={j.status === "suspensa" ? "danger" : j.status === "publicada" ? "mint" : "neutral"}>{j.status}</Badge></td>
                <td className="p-3">{j.flags.length ? j.flags.map((f) => <Badge key={f} tone="amber" className="mb-1 mr-1">{f}</Badge>) : <span className="text-muted">—</span>}</td>
                <td className="p-3">
                  <form action={moderateJob}>
                    <input type="hidden" name="id" value={j.id} />
                    {j.status === "suspensa"
                      ? <><input type="hidden" name="status" value="pausada" /><button className="font-semibold text-brand hover:underline">Retirar suspensão</button></>
                      : <><input type="hidden" name="status" value="suspensa" /><button className="font-semibold text-danger hover:underline">Suspender</button></>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
