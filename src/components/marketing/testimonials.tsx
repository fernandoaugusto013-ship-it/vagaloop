import { Avatar } from "@/components/ui/misc";

type T = { id: string; author_name: string; author_role: string | null; company: string | null; quote: string; avatar_url: string | null };

/** Só renderiza depoimentos reais cadastrados e publicados pelo admin. */
export function Testimonials({ items }: { items: T[] }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Quem já contrata com a VagaLoop</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.id} className="rounded-2xl border border-line bg-surface p-6">
            <blockquote className="leading-relaxed text-ink">“{t.quote}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <Avatar name={t.author_name} src={t.avatar_url} size={40} className="rounded-full" />
              <div className="text-sm"><p className="font-bold">{t.author_name}</p><p className="text-muted">{[t.author_role, t.company].filter(Boolean).join(", ")}</p></div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function LogoStrip({ items }: { items: { id: string; name: string; logo_url: string; url: string | null }[] }) {
  if (!items.length) return null;
  return (
    <section aria-label="Empresas clientes" className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-6 px-4 sm:px-6">
      {items.map((l) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={l.id} src={l.logo_url} alt={l.name} className="h-8 w-auto opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" />
      ))}
    </section>
  );
}
