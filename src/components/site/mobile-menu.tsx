"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/vagas", label: "Vagas" },
  { href: "/quero-contratar", label: "Contratar com especialista" },
  { href: "/recrutadores", label: "Para recrutadoras" },
  { href: "/quem-somos", label: "Quem somos" },
];

export function MobileMenu({ loggedHref }: { loggedHref: string | null }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="menu-movel" aria-label="Abrir menu"
        className="grid size-10 place-items-center rounded-full text-ink hover:bg-surface-2">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open ? (
        <nav id="menu-movel" aria-label="Menu" className="absolute inset-x-0 top-16 border-b border-line bg-surface px-4 pb-6 pt-2 shadow-card">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="block rounded-xl px-3 py-3 font-semibold text-ink hover:bg-surface-2">{n.label}</Link>)}
          <div className="mt-3 grid gap-2">
            {loggedHref ? (
              <Link href={loggedHref} className="rounded-full bg-brand px-4 py-3 text-center font-semibold text-brand-ink">Meu painel</Link>
            ) : (
              <>
                <Link href="/cadastro?perfil=empresa" className="rounded-full bg-brand px-4 py-3 text-center font-semibold text-brand-ink">Publicar vaga grátis</Link>
                <Link href="/entrar" className="rounded-full border border-line px-4 py-3 text-center font-semibold text-ink">Entrar</Link>
              </>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
