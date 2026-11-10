import type { Metadata } from "next";
import { Card } from "@/components/ui/misc";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { Testimonials } from "@/components/marketing/testimonials";
import { getFaqs, getPublicSettings, getTestimonials } from "@/lib/public-data";
import { formatBRL } from "@/lib/format";
import { EarningsSimulator } from "./simulator";

export const metadata: Metadata = {
  title: "Programa Recrutadora VagaLoop",
  description: "Ferramentas de IA, método, mentoria, comunidade e fluxo de clientes para recrutadoras independentes.",
  alternates: { canonical: "/recrutadores" },
};
export const revalidate = 300;

const BENEFITS = [
  ["Método e certificação", "Trilha prática do alinhamento à entrega de finalistas, com certificado ao concluir."],
  ["Ferramentas de IA", "O mesmo ATS das empresas: pipeline, ranking por aderência e criação de vagas com a Lia."],
  ["Fluxo de clientes", "Processos gerenciados da plataforma chegam para recrutadoras do setor da vaga."],
  ["Mentoria", "Encontros com recrutadoras experientes para destravar casos difíceis."],
  ["Comunidade", "Troca de dúvidas, casos e indicação de clientes entre colegas."],
  ["Sua marca", "Perfil público com contratações, nota média e avaliações de clientes."],
];

export default async function Recrutadores() {
  const [s, faqs, testimonials] = await Promise.all([getPublicSettings(), getFaqs("recrutadores"), getTestimonials("recrutadores")]);
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-start gap-12 px-4 pb-12 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">Programa Recrutadora VagaLoop</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Recrute com IA, método e clientes chegando até você.</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            Plano mensal de {formatBRL(s.recruiter_monthly_fee)}, sem taxa de adesão, cancelamento quando quiser e
            garantia de {s.recruiter_refund_days} dias com reembolso integral.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map(([t, d]) => (
              <li key={t} className="rounded-2xl border border-line bg-surface p-5"><h2 className="font-bold">{t}</h2><p className="mt-1 text-sm leading-relaxed text-muted">{d}</p></li>
            ))}
          </ul>
        </div>
        <EarningsSimulator splitPct={s.platform_split_pct} defaultTicket={s.managed_ticket_reference} monthlyFee={s.recruiter_monthly_fee} />
      </section>

      <div className="mt-12"><Testimonials items={testimonials} /></div>

      <section className="mx-auto mt-16 max-w-3xl px-4 sm:px-6">
        <Card className="p-7">
          <h2 className="text-xl font-bold">Quero participar</h2>
          <p className="mb-6 mt-1 text-sm text-muted">As vagas no programa abrem por turmas. Deixe seus dados e avisamos você.</p>
          <LeadForm type="recrutadora" />
        </Card>
      </section>

      <div className="mt-20"><Faq items={faqs} /></div>
    </>
  );
}
