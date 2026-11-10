import Link from "next/link";
import { Avatar, Badge } from "@/components/ui/misc";
import { CONTRACT_TYPES, WORK_MODES } from "@/lib/constants";
import { daysAgo, formatSalary, isNew, jobPath } from "@/lib/format";
import type { JobCardData } from "@/lib/public-data";

export function JobCard({ job }: { job: JobCardData }) {
  const company = job.is_confidential ? null : job.company_name;
  const place = job.work_mode === "remoto" && !job.city ? "Brasil (remoto)" : `${job.city}/${job.uf}`;
  return (
    <article className="group relative flex gap-4 rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-card focus-within:shadow-card">
      <Avatar name={company ?? "Confidencial"} src={company ? job.company_logo_url : null} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[1.05rem] font-bold leading-snug text-ink">
            <Link href={jobPath(job)} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">{job.title}</Link>
          </h3>
          {isNew(job.published_at) ? <Badge tone="mint">Nova</Badge> : null}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {company && job.company_slug ? (
            <Link href={`/empresas/${job.company_slug}`} className="relative z-10 font-medium hover:text-brand">{company}</Link>
          ) : (
            <span className="italic">Empresa confidencial</span>
          )}
        </p>
        <p className="mt-2.5 font-semibold text-ink">{formatSalary(job)}</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li>{place}</li>
          <li>{WORK_MODES[job.work_mode]}</li>
          <li>{CONTRACT_TYPES[job.contract_type]}</li>
          <li className="ml-auto text-xs">{daysAgo(job.published_at)}</li>
        </ul>
      </div>
    </article>
  );
}
