"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { talkToLia } from "@/app/actions/jobs";
import type { ChatMessage } from "@/lib/ai/provider";
import type { PartialJobDraft } from "@/lib/job-schema";
import { JobForm, emptyDraft } from "./job-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { LoopMark } from "@/components/logo";
import { cn } from "@/lib/cn";

const GREETING = "Oi! Eu sou a Lia. Me conte sobre a vaga do jeito que preferir: cargo, o que a pessoa vai fazer, contrato, local, salário… Eu pergunto o que faltar e monto tudo para você revisar.";
const EXAMPLES = [
  "Preciso de uma analista de dados pleno, CLT, híbrido em Recife/PE, R$ 6.000 a 7.500",
  "Vaga de estágio em marketing, remoto, bolsa de R$ 1.500",
  "Vendedor externo PJ em Curitiba/PR, comissão + fixo de R$ 2.500",
];

export function LiaWorkspace({ companyName }: { companyName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: GREETING }]);
  const [draft, setDraft] = useState<PartialJobDraft>(emptyDraft());
  const [missing, setMissing] = useState<string[]>([]);
  const [mode, setMode] = useState<"ia" | "heuristico" | null>(null);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [startedAt] = useState(() => Date.now());
  const endRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"chat" | "form">("chat");

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [messages, pending]);

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(history);
    setInput("");
    start(async () => {
      try {
        const r = await talkToLia(history, draft);
        setDraft(r.draft);
        setMissing(r.missing);
        setMode(r.mode);
        setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
      } catch {
        setMessages((m) => [...m, { role: "assistant", content: "Tive um problema agora. Pode repetir? Se preferir, preencha direto o formulário." }]);
      }
    });
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);

  return (
    <div>
      <div className="mb-4 flex gap-2 lg:hidden" role="tablist">
        <Button type="button" role="tab" aria-selected={tab === "chat"} variant={tab === "chat" ? "primary" : "secondary"} size="sm" onClick={() => setTab("chat")}>Conversa</Button>
        <Button type="button" role="tab" aria-selected={tab === "form"} variant={tab === "form" ? "primary" : "secondary"} size="sm" onClick={() => setTab("form")}>Rascunho {missing.length === 0 && draft.title ? "✓" : ""}</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <section aria-label="Conversa com a Lia" className={cn("flex h-[70dvh] flex-col rounded-2xl border border-line bg-surface lg:sticky lg:top-6", tab !== "chat" && "hidden lg:flex")}>
          <header className="flex items-center gap-2 border-b border-line px-5 py-3.5">
            <LoopMark className="h-5" animated={pending} />
            <p className="font-bold">Lia</p>
            {mode === "heuristico" ? <Badge tone="amber" title="Sem chave de IA configurada: a Lia usa regras locais">modo básico</Badge> : null}
            <span className="ml-auto text-xs text-muted">{missing.length && draft.title ? `faltam ${missing.length} itens` : ""}</span>
          </header>
          <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((m, i) => (
              <li key={i} className={cn("max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed",
                m.role === "assistant" ? "bg-surface-2 text-ink" : "ml-auto bg-brand text-brand-ink")}>
                {m.content}
              </li>
            ))}
            {pending ? <li className="w-16 rounded-2xl bg-surface-2 px-4 py-2.5 text-muted" aria-label="Lia está digitando">…</li> : null}
            <div ref={endRef} />
          </ol>
          {messages.length === 1 ? (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {EXAMPLES.map((e) => <button key={e} type="button" onClick={() => send(e)} className="rounded-full border border-line px-3 py-1.5 text-left text-xs text-muted hover:border-brand hover:text-brand">{e}</button>)}
            </div>
          ) : null}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-line p-3">
            <label htmlFor="lia-input" className="sr-only">Mensagem para a Lia</label>
            <textarea id="lia-input" rows={1} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Escreva sobre a vaga…" className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[0.95rem] focus:border-brand focus:outline-none" />
            <Button type="submit" disabled={pending || !input.trim()}>Enviar</Button>
          </form>
        </section>

        <section aria-label="Rascunho da vaga" className={cn("rounded-2xl border border-line bg-surface p-6", tab !== "form" && "hidden lg:block")}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Rascunho da vaga</h2>
            {missing.length === 0 && draft.title ? <Badge tone="mint">Pronto para publicar · {Math.max(1, Math.round(elapsed / 60))} min</Badge> : null}
          </div>
          <JobForm draft={draft} onChange={setDraft} via="lia" companyName={companyName} highlight={draft.title ? missing : []} />
        </section>
      </div>
    </div>
  );
}
