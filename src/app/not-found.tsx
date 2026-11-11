import { ButtonLink } from "@/components/ui/button";
import { LoopMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main id="conteudo" className="mx-auto grid min-h-[70dvh] max-w-lg place-items-center px-4 text-center">
      <div>
        <LoopMark className="mx-auto h-10" animated />
        <h1 className="mt-6 text-3xl font-extrabold">Página não encontrada</h1>
        <p className="mt-2 text-muted">A vaga pode ter sido encerrada ou o endereço mudou.</p>
        <div className="mt-6 flex justify-center gap-3"><ButtonLink href="/vagas">Ver vagas abertas</ButtonLink><ButtonLink href="/" variant="secondary">Início</ButtonLink></div>
      </div>
    </main>
  );
}
