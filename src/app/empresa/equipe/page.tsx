import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { InviteForm } from "@/components/company/invite-form";
import { removeMember, revokeInvite } from "@/app/actions/company";
import { requireCompany } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export default async function Equipe() {
  const { supabase, company, memberRole, user } = await requireCompany();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("company_members").select("user_id, role, created_at, profiles(full_name)").eq("company_id", company.id).order("created_at"),
    memberRole === "owner"
      ? supabase.from("company_invites").select("id, email, role, expires_at").eq("company_id", company.id).is("accepted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  return (
    <>
      <PageHeader title="Equipe" description="Quem do seu time acessa as vagas e candidatos da empresa." />
      {memberRole === "owner" ? <Card className="mb-6"><h2 className="mb-4 font-bold">Convidar pessoa</h2><InviteForm /></Card> : null}
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {(members ?? []).map((m) => {
            const name = (m.profiles as unknown as { full_name: string } | null)?.full_name || "Sem nome";
            return (
              <li key={m.user_id} className="flex items-center gap-3 px-6 py-4">
                <div className="flex-1"><p className="font-semibold">{name}{m.user_id === user.id ? " (você)" : ""}</p><p className="text-sm text-muted">Desde {formatDate(m.created_at)}</p></div>
                <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{m.role === "owner" ? "Administrador(a)" : "Membro"}</Badge>
                {memberRole === "owner" && m.user_id !== user.id ? (
                  <form action={removeMember}><input type="hidden" name="user_id" value={m.user_id} /><button className="text-sm font-semibold text-danger hover:underline">Remover</button></form>
                ) : null}
              </li>
            );
          })}
          {(invites ?? []).map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-6 py-4">
              <div className="flex-1"><p className="font-semibold">{i.email}</p><p className="text-sm text-muted">Convite pendente · expira em {formatDate(i.expires_at)}</p></div>
              <Badge tone="amber">Pendente</Badge>
              <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><button className="text-sm font-semibold text-danger hover:underline">Cancelar</button></form>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
