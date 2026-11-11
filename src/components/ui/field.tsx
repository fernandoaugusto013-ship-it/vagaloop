import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control = "rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-muted/70 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60";

export function Field({ label, hint, error, children, className, htmlFor }: {
  label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string; htmlFor?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">{label}</label>
      {children}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

/** Largura total por padrão; uma classe w-* passada pelo chamador substitui (sem conflito de CSS). */
const width = (c?: string) => (c && /(^|\s)([a-z]+:)?w-/.test(c) ? "" : "w-full");

export const Input = ({ className, ...p }: ComponentProps<"input">) => <input className={cn(control, width(className), "h-11", className)} {...p} />;
export const Textarea = ({ className, ...p }: ComponentProps<"textarea">) => <textarea className={cn(control, width(className), "min-h-28 leading-relaxed", className)} {...p} />;
export const Select = ({ className, ...p }: ComponentProps<"select">) => <select className={cn(control, width(className), "h-11 pr-8", className)} {...p} />;

export function Checkbox({ label, className, ...p }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-ink", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" {...p} />
      <span>{label}</span>
    </label>
  );
}
