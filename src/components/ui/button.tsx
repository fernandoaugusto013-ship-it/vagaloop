import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-brand text-brand-ink hover:bg-brand-strong shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:border-brand hover:text-brand",
  soft: "bg-brand-soft text-brand-soft-ink hover:brightness-95",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-95",
};
const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-5 text-[0.95rem]", lg: "h-13 px-7 text-base" };

type Common = { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string };
const base = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap";

export function Button({ variant = "primary", size = "md", className, ...props }: Common & ComponentProps<"button">) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: Common & ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
