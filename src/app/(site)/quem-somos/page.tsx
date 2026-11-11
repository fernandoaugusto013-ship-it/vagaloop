import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { LoopMark } from "@/components/logo";

export const metadata: Metadata = { title: "Quem somos", description: "A VagaLoop une IA e recrutadoras especialistas para contratar com mais velocidade e cuidado.", alternates: { canonical: "/quem-somos" } };

export default function QuemSomos() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <LoopMark className="h-10" animated />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">Recrutamento é um ciclo. A gente fecha o laço.</h1>
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted">
        <p>
          A VagaLoop nasceu de uma constatação simples: empresas perdem semanas lendo currículos que não têm a ver com a vaga,
          candidatos ficam sem resposta e boas recrutadoras independentes passam mais tempo procurando clientes do que recrutando.
        </p>
        <p>
          Por isso juntamos três pontas no mesmo lugar. Empresas publicam vagas de graça e recebem candidatos já ordenados por aderência.
          Candidatos se candidatam em poucos cliques e veem em que etapa estão. E recrutadoras especialistas entram quando a vaga pede gente experiente.
        </p>
        <p className="text-ink">
          Nosso princípio: a IA ajuda a priorizar, mas quem decide é sempre uma pessoa. O índice de aderência vem com justificativa,
          não usa dados como idade, gênero ou deficiência, e o contato do candidato só chega à empresa depois da contratação.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/cadastro?perfil=empresa">Publicar vaga grátis</ButtonLink>
        <ButtonLink href="/vagas" variant="secondary">Ver vagas</ButtonLink>
      </div>
    </article>
  );
}
