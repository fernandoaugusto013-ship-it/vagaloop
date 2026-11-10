export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">Versão {updated}</p>
      <div className="mt-8 space-y-6 leading-relaxed text-ink [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted [&_li]:text-muted">{children}</div>
    </article>
  );
}
