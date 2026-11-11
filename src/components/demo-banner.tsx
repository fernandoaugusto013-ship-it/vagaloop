import Link from "next/link";
import { isDemo } from "@/lib/env";

export function DemoBanner() {
  if (!isDemo) return null;
  return (
    <div role="note" className="bg-ink px-4 py-2 text-center text-[0.8rem] text-bg">
      <strong>Modo demonstração.</strong> Dados fictícios, que voltam ao início quando o servidor reinicia.{" "}
      <Link href="/entrar" className="font-semibold underline">Entrar como empresa, candidata ou admin</Link>
      {" · "}
      <Link href="/demo/emails" className="font-semibold underline">E-mails enviados</Link>
    </div>
  );
}
