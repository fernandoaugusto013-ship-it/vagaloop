import type { Metadata } from "next";
import { Card } from "@/components/ui/misc";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { Testimonials } from "@/components/marketing/testimonials";
import { getFaqs, getPublicSettings, getTestimonials } from "@/lib/public-data";
import { formatBRL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contrate com uma especialista",
  description: "Uma recrutadora do seu setor faz a busca, a triagem e as entrevistas, e entrega finalistas com parecer. Você paga só depois de contratar.",
  alternates: { canonical: "/quero-contratar" },
};
export const revalidate = 300;

export default async function QueroContratar() {
  const [s, faqs, testimonials] = await Promise.all([getPublicSettings(), getFaqs("contratar"), getTestimonials("contratar")]);
  const steps = [
    { t: "Alinhamento da vaga", d: "Uma conversa para entender o perfil, o time e o que faz alguém dar certo aí." },
    { t: "Busca e pré-seleção", d: "IA para varrer e ranquear candidatos; a especialista faz hunting ativo e entrevistas." },
    { t: "Finalistas com parecer", d: `Você recebe ${s.finalists_count} finalistas com resumo, fit técnico, fit cultural, pretensão e pontos de atenção.` },
    { t: "Contratação e garantia", d: `Você escolhe e contrata. Se a pessoa sair em até ${s.guarantee_days} dias, reabrimos sem custo.` },
  ];
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-12 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Serviço gerenciado</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Uma especialista do seu setor cuidando da sua vaga.</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Valor fechado por vaga, cobrado só depois da contratação, com garantia de reposição.
            Sem percentual do salário anual e sem assinatura.
          </p>
          <ol className="mt-10 space-y-5">
            {steps.map((st, i) => (
              <li key={st.t} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-brand-ink">{i + 1}</span>
                <div><h2 className="font-bold">{st.t}</h2><p className="mt-0.5 text-muted">{st.d}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <Card className="self-start p-7 lg:sticky lg:top-24">
          <h2 className="text-xl font-bold">Fale com a gente</h2>
          <p className="mb-6 mt-1 text-sm text-muted">Respondemos em até 1 dia útil.</p>
          <LeadForm type="contratar" />
        </Card>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Como se compara</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-[0.95rem]">
            <caption className="sr-only">Comparação entre VagaLoop, consultorias e sites de vagas</caption>
            <thead className="border-b border-line text-sm text-muted">
              <tr><th className="p-4 font-semibold"></th><th className="p-4 font-bold text-brand">VagaLoop especialista</th><th className="p-4 font-semibold">Consultoria tradicional</th><th className="p-4 font-semibold">Site de vagas</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Como cobra", "Valor fechado por vaga", "Percentual do salário anual", "Assinatura mensal"],
                ["Quando paga", "Depois da contratação", "Em geral, parte adiantada", "Todo mês, contratando ou não"],
                ["Quem faz a triagem", "Especialista do setor + IA", "Consultor(a)", "Seu time"],
                ["Garantia", `Reposição em ${s.guarantee_days} dias`, "Varia por contrato", "Não se aplica"],
              ].map(([k, ...v]) => (
                <tr key={k}><th scope="row" className="p-4 font-semibold">{k}</th>{v.map((c, i) => <td key={i} className={i === 0 ? "p-4 font-semibold" : "p-4 text-muted"}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {s.pricing_table.length ? (
          <div className="mt-10">
            <h3 className="text-xl font-bold">Valores de referência por vaga</h3>
            <p className="mt-1 text-sm text-muted">A proposta final depende da complexidade da vaga, combinada no alinhamento.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {s.pricing_table.map((p) => (
                <li key={p.nivel} className="rounded-2xl border border-line bg-surface p-5">
                  <p className="font-bold">{p.nivel}</p><p className="text-xs text-muted">{p.faixa_salarial}</p>
                  <p className="mt-3 text-xl font-extrabold">{formatBRL(p.valor)}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="mt-20"><Testimonials items={testimonials} /></div>
      <div className="mt-20"><Faq items={faqs} /></div>
    </>
  );
}
