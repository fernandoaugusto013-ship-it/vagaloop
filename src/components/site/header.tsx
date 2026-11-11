import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSupabaseConfigured } from "@/lib/env";
import { HeaderAuth } from "./header-auth";

const NAV = [
  { href: "/vagas", label: "Vagas" },
  { href: "/quero-contratar", label: "Contratar com especialista" },
  { href: "/recrutadores", label: "Para recrutadoras" },
  { href: "/quem-somos", label: "Quem somos" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-ink">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <HeaderAuth configured={isSupabaseConfigured} />
        </div>
      </div>
    </header>
  );
}
