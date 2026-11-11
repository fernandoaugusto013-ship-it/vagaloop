import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { updateLead } from "@/app/actions/admin";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

const STATUS = { novo: "Novo", em_contato: "Em contato", qualificado: "Qualificado", ganho: "Ganho", perdido: "Perdido" };

export default async function Leads({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { supabase } = await requireRole("admin");
  const { tipo } = await searchParams;
  let q = supabase.from("leads").select("*, owner:profiles!leads_owner_id_fkey(full_name)").order("created_at", { ascending: false }).limit(200);
  if (tipo === "contratar" || tipo === "recrutadora") q = q.eq("type", tipo);
  const { data: leads } = await q;
  return (
    <>
      <PageHeader title="Leads" description="Formulários “Quero contratar” e “Quero ser recrutadora”." actions={
        <nav className="flex gap-2 text-sm font-semibold">
          {[["", "Todos"], ["contratar", "Contratar"], ["recrutadora", "Recrutadoras"]].map(([v, l]) => <a key={v} href={v ? `?tipo=${v}` : "?"} className={`rounded-full px-3 py-1.5 ${tipo === v || (!tipo && !v) ? "bg-brand text-brand-ink" : "border border-line"}`}>{l}</a>)}
        </nav>
      } />
      {!leads?.length ? <EmptyState title="Nenhum lead ainda" /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line text-muted"><tr><th className="p-3">Lead</th><th className="p-3">Detalhes</th><th className="p-3">Recebido</th><th className="p-3">Responsável</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {leads.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="p-3"><p className="font-semibold">{l.name}</p><a href={`mailto:${l.email}`} className="text-brand">{l.email}</a>{l.whatsapp ? <p className="text-muted">{l.whatsapp}</p> : null}</td>
                  <td className="p-3"><Badge tone={l.type === "contratar" ? "brand" : "mint"}>{l.type === "contratar" ? "Contratar" : "Recrutadora"}</Badge><p className="mt-1 text-muted">{[l.company_name, l.company_size && `${l.company_size} pessoas`, l.hires_count && `${l.hires_count} vaga(s)`, l.city && `${l.city}/${l.uf ?? ""}`].filter(Boolean).join(" · ")}</p></td>
                  <td className="p-3 text-muted">{formatDateTime(l.created_at)}</td>
                  <td className="p-3">{(l.owner as unknown as { full_name: string } | null)?.full_name ?? "—"}</td>
                  <td className="p-3">
                    <form action={updateLead} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={l.id} />
                      <select name="status" defaultValue={l.status} className="h-9 rounded-lg border border-line bg-surface px-2">{Object.entries(STATUS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="assign" value="me" /> assumir</label>
                      <button className="text-sm font-semibold text-brand hover:underline">Salvar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
