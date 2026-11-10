import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui/misc";
import { verifyCompany } from "@/app/actions/admin";
import { requireRole } from "@/lib/auth";
import { formatCnpj } from "@/lib/cnpj";
import { formatDate } from "@/lib/format";

export default async function AdminEmpresas() {
  const { supabase } = await requireRole("admin");
  const { data } = await supabase.from("companies").select("id, name, slug, cnpj, sector, size, city, uf, is_verified, created_at, jobs(count), company_members(count)").order("created_at", { ascending: false }).limit(300);
  return (
    <>
      <PageHeader title="Empresas" />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line text-muted"><tr><th className="p-3">Empresa</th><th className="p-3">CNPJ</th><th className="p-3">Vagas</th><th className="p-3">Time</th><th className="p-3">Desde</th><th className="p-3">Verificação</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td className="p-3"><Link href={`/empresas/${c.slug}`} className="font-semibold hover:text-brand">{c.name}</Link><p className="text-xs text-muted">{[c.sector, c.size, c.city && `${c.city}/${c.uf}`].filter(Boolean).join(" · ")}</p></td>
                <td className="p-3 tabular-nums">{c.cnpj ? formatCnpj(c.cnpj) : "—"}</td>
                <td className="p-3">{(c.jobs as unknown as { count: number }[])[0]?.count ?? 0}</td>
                <td className="p-3">{(c.company_members as unknown as { count: number }[])[0]?.count ?? 0}</td>
                <td className="p-3 text-muted">{formatDate(c.created_at)}</td>
                <td className="p-3">
                  <form action={verifyCompany} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="value" value={String(!c.is_verified)} />
                    {c.is_verified ? <Badge tone="mint">Verificada</Badge> : null}
                    <button className="text-sm font-semibold text-brand hover:underline">{c.is_verified ? "Remover" : "Verificar"}</button>
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
