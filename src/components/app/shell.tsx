import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/misc";
import { NavLinks, type NavItem } from "./nav-links";

export function AppShell({ nav, user, area, children, banner }: {
  nav: NavItem[]; user: { name: string; subtitle?: string }; area: string; children: React.ReactNode; banner?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo href="/" />
          <div className="lg:hidden"><ThemeToggle /></div>
        </div>
        <p className="hidden px-5 pb-2 text-xs font-bold uppercase tracking-wider text-muted lg:block">{area}</p>
        <NavLinks items={nav} />
        <div className="hidden border-t border-line p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={36} className="rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name || "Minha conta"}</p>
              {user.subtitle ? <p className="truncate text-xs text-muted">{user.subtitle}</p> : null}
            </div>
            <ThemeToggle />
          </div>
          <form action="/sair" method="post" className="mt-3">
            <button className="w-full rounded-full px-3 py-2 text-left text-sm font-semibold text-muted hover:bg-surface-2 hover:text-ink">Sair</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        {banner}
        <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</main>
        <form action="/sair" method="post" className="px-4 pb-8 lg:hidden"><button className="text-sm font-semibold text-muted">Sair</button></form>
      </div>
    </div>
  );
}
