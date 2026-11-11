export function Faq({ items, title = "Perguntas frequentes" }: { items: { id: string; question: string; answer: string }[]; title?: string }) {
  if (!items.length) return null;
  const ld = JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
  }).replace(/</g, "\\u003c");
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-surface">
        {items.map((i) => (
          <details key={i.id} className="group px-5 py-4 open:pb-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
              {i.question}
              <span aria-hidden className="text-xl text-brand transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 leading-relaxed text-muted">{i.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
