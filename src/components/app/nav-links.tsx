"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; exact?: boolean };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Área logada" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              active ? "bg-brand-soft text-brand-soft-ink" : "text-muted hover:bg-surface-2 hover:text-ink")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
