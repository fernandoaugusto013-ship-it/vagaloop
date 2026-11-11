import { PageHeader } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { setUserRole } from "@/app/actions/admin";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";

const ROLES = { candidate: "Candidato", company: "Empresa", recruiter: "Recrutadora", admin: "Admin" };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ q?: string; papel?: string }> }) {
  const { supabase, user } = await requireRole("admin");
  const { q, papel } = await searchParams;
  let query = supabase.from("profiles").select("id, full_name, role, created_at").order("created_at", { ascending: false }).limit(300);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_]/g, "")}%`);
  if (papel && papel in ROLES) query = query.eq("role", papel);
  const { data } = await query;
  return (
    <>
      <PageHeader title="Usuários" description="Mudanças de papel ficam registradas na auditoria." />
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Buscar por nome" className="max-w-xs" />
        <select name="papel" defaultValue={papel ?? ""} className="h-11 rounded-xl border border-line bg-surface px-3"><option value="">Todos os papéis</option>{Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button className="rounded-full bg-brand px-5 font-semibold text-brand-ink">Filtrar</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-muted"><tr><th className="p-3">Nome</th><th className="p-3">Desde</th><th className="p-3">Papel</th></tr></thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-semibold">{u.full_name || "Sem nome"}{u.id === user.id ? " (você)" : ""}</td>
                <td className="p-3 text-muted">{formatDate(u.created_at)}</td>
                <td className="p-3">
                  {u.id === user.id ? ROLES[u.role as keyof typeof ROLES] : (
                    <form action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="h-9 rounded-lg border border-line bg-surface px-2">{Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                      <button className="font-semibold text-brand hover:underline">Salvar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
