import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";

export const metadata: Metadata = { title: "Central de cookies", alternates: { canonical: "/cookies" } };

export default function Cookies() {
  return (
    <LegalPage title="Central de cookies" updated="2026-11">
      <p>Hoje a VagaLoop usa apenas cookies essenciais. Não usamos cookies de publicidade ou de rastreamento entre sites.</p>
      <h2>Essenciais</h2>
      <ul>
        <li><strong>Sessão de login</strong> (sb-*): mantém você conectado com segurança.</li>
        <li><strong>Preferência de tema</strong> (armazenamento local vagaloop_tema): lembra se você prefere o tema claro ou escuro.</li>
      </ul>
      <h2>Analytics</h2>
      <p>Quando ativarmos medição de audiência, ela será opcional e você poderá aceitar ou recusar por aqui antes de qualquer coleta.</p>
    </LegalPage>
  );
}
