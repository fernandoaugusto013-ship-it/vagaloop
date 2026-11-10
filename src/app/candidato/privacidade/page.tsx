import { Card, PageHeader } from "@/components/ui/misc";
import { DeleteAccount } from "@/components/candidate/delete-account";
import { requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

const PURPOSE: Record<string, string> = { termos_e_privacidade: "Termos de uso e Política de Privacidade", tratamento_dados_candidatura: "Compartilhar perfil em candidatura", alertas_vagas: "Alertas de vagas" };

export default async function Privacidade() {
  const { supabase, user } = await requireRole("candidate");
  const { data: consents } = await supabase.from("consents").select("id, purpose, version, granted, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  return (
    <>
      <PageHeader title="Privacidade e dados" description="Seus direitos pela LGPD, sem precisar pedir para ninguém." />
      <div className="grid max-w-4xl gap-6">
        <Card>
          <h2 className="font-bold">Exportar meus dados</h2>
          <p className="mt-1 text-sm text-muted">Baixe um arquivo com seu perfil, contato, currículos (dados extraídos), candidaturas e consentimentos.</p>
          <a href="/candidato/privacidade/exportar" className="mt-4 inline-flex h-11 items-center rounded-full border border-line px-5 font-semibold hover:border-brand hover:text-brand">Baixar meus dados (JSON)</a>
        </Card>
        <Card>
          <h2 className="font-bold">Consentimentos registrados</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {(consents ?? []).map((c) => <li key={c.id} className="flex justify-between gap-3 py-2"><span>{PURPOSE[c.purpose] ?? c.purpose} <span className="text-muted">(v{c.version})</span></span><span className="text-muted">{formatDateTime(c.created_at)}</span></li>)}
          </ul>
        </Card>
        <Card className="border-danger/40">
          <h2 className="font-bold text-danger">Excluir minha conta</h2>
          <p className="mt-1 text-sm text-muted">Apaga perfil, contato, currículos e candidaturas. Não dá para desfazer.</p>
          <div className="mt-4"><DeleteAccount /></div>
        </Card>
      </div>
    </>
  );
}
