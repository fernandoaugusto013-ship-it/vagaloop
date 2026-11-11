import { Card, PageHeader } from "@/components/ui/misc";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export default async function Configuracoes() {
  const { supabase } = await requireRole("admin");
  const [{ data: rows }, { data: logs }] = await Promise.all([
    supabase.from("settings").select("key, label, value, is_public").order("key"),
    supabase.from("audit_logs").select("id, entity_id, data, created_at, actor:profiles!audit_logs_actor_id_fkey(full_name)").eq("entity", "settings").order("created_at", { ascending: false }).limit(15),
  ]);
  return (
    <>
      <PageHeader title="Configurações comerciais" description="Mensalidade, split, garantia, finalistas e tabela de preços. Tudo muda sem deploy e fica registrado." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card><SettingsForm rows={rows ?? []} /></Card>
        <Card>
          <h2 className="font-bold">Últimas alterações</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {(logs ?? []).map((l) => {
              const d = l.data as { de: unknown; para: unknown };
              return <li key={l.id}><p className="font-semibold">{l.entity_id}</p><p className="text-muted">{JSON.stringify(d.de)} → {JSON.stringify(d.para)}</p><p className="text-xs text-muted">{(l.actor as unknown as { full_name: string } | null)?.full_name ?? "sistema"} · {formatDateTime(l.created_at)}</p></li>;
            })}
            {!logs?.length ? <li className="text-muted">Nenhuma alteração ainda.</li> : null}
          </ul>
        </Card>
      </div>
    </>
  );
}
