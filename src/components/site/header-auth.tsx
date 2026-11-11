"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { MobileMenu } from "./mobile-menu";

const HOME: Record<string, string> = { admin: "/admin", company: "/empresa", recruiter: "/recrutadora", candidate: "/candidato" };

/** Lê a sessão no navegador: as páginas públicas continuam estáticas (cache/CDN). */
export function HeaderAuth({ configured }: { configured: boolean }) {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    if (!configured) return;
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      setHref(HOME[p?.role ?? "candidate"]);
    });
  }, [configured]);

  return (
    <>
      {href ? (
        <Link href={href} className="hidden h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-ink hover:bg-brand-strong sm:inline-flex">Meu painel</Link>
      ) : (
        <>
          <Link href="/entrar" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-2 sm:block">Entrar</Link>
          <Link href="/cadastro?perfil=empresa" className="hidden h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-ink hover:bg-brand-strong sm:inline-flex">Publicar vaga grátis</Link>
        </>
      )}
      <MobileMenu loggedHref={href} />
    </>
  );
}
