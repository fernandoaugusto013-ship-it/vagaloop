"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JobCard } from "./job-card";
import type { JobCardData } from "@/lib/public-data";

/** Paginação por cursor: link "Próxima página" (funciona sem JS) + rolagem infinita no celular. */
export function JobList({ initial, nextCursor, query, basePath = "/vagas" }: {
  initial: JobCardData[]; nextCursor: string | null; query: string; basePath?: string;
}) {
  const [jobs, setJobs] = useState(initial);
  const [cursor, setCursor] = useState(nextCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => { setJobs(initial); setCursor(nextCursor); }, [initial, nextCursor]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams(query);
      params.set("cursor", cursor);
      const res = await fetch(`/api/vagas?${params}`);
      const data = (await res.json()) as { jobs: JobCardData[]; nextCursor: string | null };
      setJobs((j) => [...j, ...data.jobs]);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || !matchMedia("(max-width: 768px)").matches) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  const nextHref = (() => {
    const p = new URLSearchParams(query);
    if (cursor) p.set("cursor", cursor);
    return `${basePath}?${p}`;
  })();

  return (
    <div>
      <div className="grid gap-3" aria-live="polite">
        {jobs.map((j) => <JobCard key={j.id} job={j} />)}
      </div>
      <div ref={sentinel} />
      {cursor ? (
        <div className="mt-8 flex justify-center">
          <Link href={nextHref} onClick={(e) => { e.preventDefault(); loadMore(); }}
            className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink hover:border-brand hover:text-brand" aria-busy={loading}>
            {loading ? "Carregando…" : "Próxima página"}
          </Link>
        </div>
      ) : jobs.length ? <p className="mt-8 text-center text-sm text-muted">Você chegou ao fim da lista.</p> : null}
    </div>
  );
}
