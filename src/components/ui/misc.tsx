import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-surface-2 text-muted",
  brand: "bg-brand-soft text-brand-soft-ink",
  mint: "bg-mint-soft text-mint",
  amber: "bg-amber-soft text-amber",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", className, ...p }: ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-surface p-6 shadow-card", className)} {...p} />;
}

export function Notice({ tone = "brand", title, children, className }: { tone?: keyof typeof tones; title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div role="note" className={cn("rounded-xl px-4 py-3 text-sm", tones[tone], className)}>
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="text-lg font-bold text-ink">{title}</p>
      {children ? <p className="mx-auto mt-1.5 max-w-md text-muted">{children}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const letters = name.trim().split(/\s+/).filter(Boolean);
  const text = ((letters[0]?.[0] ?? "") + (letters.length > 1 ? letters[letters.length - 1][0] : "")).toUpperCase() || "?";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className={cn("shrink-0 rounded-xl border border-line bg-surface object-contain", className)} style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl bg-brand-soft font-bold text-brand-soft-ink", className)} style={{ width: size, height: size, fontSize: size * 0.36 }}>{text}</span>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
