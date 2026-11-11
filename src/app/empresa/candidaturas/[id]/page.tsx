import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, Notice } from "@/components/ui/misc";
import { ScorePill } from "@/components/pipeline/score";
import { NoteForm, RatingInput, RescoreButton, StageSelect, TagsInput } from "@/components/pipeline/application-controls";
import { requireCompany } from "@/lib/auth";
import { formatBRL, formatDateTime } from "@/lib/format";
import { WORK_MODES } from "@/lib/constants";
import type { AiSummary, CandidateProfile } from "@/lib/types";

const EVENT: Record<string, string> = { criada: "Candidatura recebida", etapa: "Mudou de etapa", nota: "Nota adicionada", avaliacao: "Avaliação alterada", ia: "Aderência calculada pela IA", email: "E-mail enviado", contato_liberado: "Contato liberado (contratação)" };

export default async function Candidatura({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireCompany();
  const { data: app } = await supabase.from("applications").select("*, jobs(id, title)").eq("id", id).maybeSingle();
  if (!app) notFound();
  const job = app.jobs as unknown as { id: string; title: string };

  const [stages, questions, notes, events, profile, cand, contact, resumes] = await Promise.all([
    supabase.from("pipeline_stages").select("id, name").eq("job_id", job.id).order("position"),
    supabase.from("job_screening_questions").select("id, question, is_knockout, expected_answer").eq("job_id", job.id),
    supabase.from("notes").select("id, body, created_at, author:profiles!notes_author_id_fkey(full_name)").eq("application_id", id).order("created_at", { ascending: false }),
    supabase.from("application_events").select("id, type, data, created_at").eq("application_id", id).order("created_at", { ascending: false }).limit(50),
    app.candidate_id ? supabase.from("profiles").select("full_name").eq("id", app.candidate_id).single() : Promise.resolve({ data: null }),
    app.candidate_id ? supabase.from("candidate_profiles").select("*").eq("user_id", app.candidate_id).maybeSingle() : Promise.resolve({ data: null }),
    // RLS: só retorna depois da contratação
    app.candidate_id ? supabase.from("candidate_contacts").select("email, phone, whatsapp, linkedin_url").eq("user_id", app.candidate_id).maybeSingle() : Promise.resolve({ data: null }),
    app.candidate_id ? supabase.from("resumes").select("storage_path, file_name").eq("user_id", app.candidate_id).eq("is_primary", true).limit(1) : Promise.resolve({ data: [] }),
  ]);

  const ext = app.external_candidate as { nome?: string; email?: string; telefone?: string; resumo?: string } | null;
  const name = profile.data?.full_name || ext?.nome || "Candidato";
  const p = cand.data as CandidateProfile | null;
  const ai = app.ai_summary as (AiSummary & { modo?: string }) | null;
  const qById = new Map((questions.data ?? []).map((q) => [q.id, q]));
  let cvUrl: string | null = null;
  if (resumes.data?.[0]) {
    const { data } = await supabase.storage.from("resumes").createSignedUrl(resumes.data[0].storage_path, 600);
    cvUrl = data?.signedUrl ?? null;
  }
  const unlocked = !!contact.data || app.source === "manual";

  return (
    <div>
      <Link href={`/empresa/vagas/${job.id}/pipeline`} className="text-sm font-semibold text-muted hover:text-brand">← {job.title}</Link>
      <header className="mt-4 flex flex-wrap items-start gap-4">
        <Avatar name={name} size={64} className="rounded-full" />
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h1>
          <p className="text-muted">{[p?.headline, p?.city ? `${p.city}${p.uf ? "/" + p.uf : ""}` : null].filter(Boolean).join(" · ") || (app.source === "manual" ? "Adicionado manualmente" : "")}</p>
        </div>
        <ScorePill score={app.match_score} status={app.ai_status} className="px-3 py-1 text-base" />
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">Análise da IA</h2>
              <div className="flex items-center gap-2">{ai?.modo === "heuristico" ? <Badge tone="amber">regras locais</Badge> : null}<RescoreButton id={id} /></div>
            </div>
            {ai ? (
              <div className="mt-3 space-y-4 text-[0.95rem]">
                <p>{ai.resumo}</p>
                <AiList title="Pontos fortes" items={ai.pontos_fortes} tone="text-mint" />
                <AiList title="Lacunas" items={ai.lacunas} tone="text-amber" />
                <AiList title="Alertas" items={ai.alertas} tone="text-danger" />
              </div>
            ) : <p className="mt-2 text-muted">{app.ai_status === "erro" ? "A análise falhou. Tente recalcular." : "Análise em andamento…"}</p>}
            <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Apoio à decisão gerado por IA, sem uso de dados sensíveis. Pode conter erros: confira no perfil antes de decidir.</p>
          </Card>

          {app.answers?.length ? (
            <Card>
              <h2 className="font-bold">Respostas de triagem</h2>
              <dl className="mt-3 space-y-3 text-[0.95rem]">
                {(app.answers as { question_id: string; answer: string }[]).map((a) => {
                  const q = qById.get(a.question_id);
                  if (!q) return null;
                  return <div key={a.question_id}><dt className="text-muted">{q.question}{q.is_knockout ? <Badge tone="neutral" className="ml-2">eliminatória</Badge> : null}</dt><dd className="font-semibold">{a.answer === "nao" ? "Não" : a.answer === "sim" ? "Sim" : a.answer}</dd></div>;
                })}
              </dl>
              {app.knockout_failed ? <Notice tone="danger" className="mt-4">Não atende a pelo menos uma pergunta eliminatória.</Notice> : null}
            </Card>
          ) : null}

          {p ? (
            <Card className="space-y-5">
              <h2 className="font-bold">Perfil profissional</h2>
              {p.summary ? <p className="text-[0.95rem] leading-relaxed">{p.summary}</p> : null}
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-muted">Pretensão</dt><dd className="font-semibold">{p.salary_expectation ? formatBRL(p.salary_expectation) : "Não informada"}</dd></div>
                <div><dt className="text-muted">Modalidades</dt><dd className="font-semibold">{p.pref_work_modes.map((m) => WORK_MODES[m]).join(", ") || "Qualquer"}</dd></div>
                <div><dt className="text-muted">Idiomas</dt><dd className="font-semibold">{p.languages.map((l) => `${l.idioma} (${l.nivel})`).join(", ") || "—"}</dd></div>
              </dl>
              {p.skills.length ? <div className="flex flex-wrap gap-1.5">{p.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div> : null}
              {p.experiences.length ? (
                <section><h3 className="mb-2 text-sm font-bold">Experiência</h3>
                  <ol className="space-y-3">{p.experiences.map((e, i) => <li key={i}><p className="font-semibold">{e.cargo} · {e.empresa}</p><p className="text-xs text-muted">{e.inicio ?? ""}{e.inicio ? " – " : ""}{e.fim || (e.inicio ? "atual" : "")}</p>{e.descricao ? <p className="mt-1 text-sm text-muted">{e.descricao}</p> : null}</li>)}</ol>
                </section>
              ) : null}
              {p.education.length ? (
                <section><h3 className="mb-2 text-sm font-bold">Formação</h3>
                  <ul className="space-y-1 text-sm">{p.education.map((e, i) => <li key={i}><strong>{e.curso}</strong> · {e.instituicao}{e.nivel ? ` (${e.nivel})` : ""}</li>)}</ul>
                </section>
              ) : null}
              {p.links.length ? <p className="text-sm">{p.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener nofollow" className="mr-3 font-semibold text-brand hover:underline">{l.rotulo || l.url}</a>)}</p> : null}
            </Card>
          ) : ext?.resumo ? <Card><h2 className="font-bold">Resumo informado</h2><p className="mt-2 whitespace-pre-line text-[0.95rem]">{ext.resumo}</p></Card> : null}

          <Card>
            <h2 className="mb-3 font-bold">Notas internas</h2>
            <NoteForm id={id} />
            <ul className="mt-5 space-y-3">
              {(notes.data ?? []).map((n) => (
                <li key={n.id} className="rounded-xl bg-surface-2 p-3 text-sm">
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{(n.author as unknown as { full_name: string } | null)?.full_name ?? "Equipe"} · {formatDateTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="space-y-5">
            <StageSelect id={id} stageId={app.stage_id} stages={stages.data ?? []} />
            <RatingInput id={id} value={app.rating} />
            <TagsInput id={id} tags={app.tags} />
          </Card>
          <Card>
            <h2 className="font-bold">Contato</h2>
            {app.source === "manual" ? (
              <p className="mt-2 text-sm">{ext?.email ?? "Sem e-mail"}{ext?.telefone ? ` · ${ext.telefone}` : ""}</p>
            ) : unlocked ? (
              <dl className="mt-2 space-y-1 text-sm">
                {contact.data?.email ? <div><dt className="sr-only">E-mail</dt><dd><a className="font-semibold text-brand" href={`mailto:${contact.data.email}`}>{contact.data.email}</a></dd></div> : null}
                {contact.data?.phone ? <div><dt className="sr-only">Telefone</dt><dd>{contact.data.phone}</dd></div> : null}
                {contact.data?.linkedin_url ? <div><dd><a className="text-brand" href={contact.data.linkedin_url} target="_blank" rel="noopener nofollow">LinkedIn</a></dd></div> : null}
                {cvUrl ? <div className="pt-2"><a href={cvUrl} className="font-semibold text-brand hover:underline">Baixar currículo original</a></div> : null}
              </dl>
            ) : (
              <Notice tone="neutral" className="mt-3" title="Contato protegido até a contratação">
                E-mail, telefone e o arquivo do currículo são liberados quando você move a pessoa para Contratado. Até lá, a VagaLoop avisa o candidato a cada mudança de etapa.
              </Notice>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-bold">Histórico</h2>
            <ol className="space-y-3 border-l border-line pl-4 text-sm">
              {(events.data ?? []).map((e) => (
                <li key={e.id} className="relative">
                  <span aria-hidden className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-brand" />
                  <p className="font-semibold">{EVENT[e.type] ?? e.type}{e.type === "etapa" && (e.data as { etapa?: string }).etapa ? `: ${(e.data as { etapa: string }).etapa}` : ""}{e.type === "ia" ? ` (${(e.data as { match_score?: number }).match_score})` : ""}</p>
                  <p className="text-xs text-muted">{formatDateTime(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AiList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items?.length) return null;
  return (
    <section>
      <h3 className={`text-sm font-bold ${tone}`}>{title}</h3>
      <ul className="mt-1 space-y-1">{items.map((i) => <li key={i} className="flex gap-2"><span aria-hidden>•</span>{i}</li>)}</ul>
    </section>
  );
}
