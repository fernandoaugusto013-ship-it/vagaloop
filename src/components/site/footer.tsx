import Link from "next/link";
import { Logo } from "@/components/logo";

const COLS = [
  { title: "Empresas", links: [["/cadastro?perfil=empresa", "Publicar vaga grátis"], ["/quero-contratar", "Contratar com especialista"], ["/entrar", "Entrar"]] },
  { title: "Candidatos", links: [["/vagas", "Buscar vagas"], ["/vagas?modalidade=remoto", "Vagas remotas"], ["/vagas?contrato=estagio", "Estágio"], ["/cadastro?perfil=candidato", "Criar perfil"]] },
  { title: "VagaLoop", links: [["/quem-somos", "Quem somos"], ["/recrutadores", "Seja recrutadora VagaLoop"]] },
  { title: "Legal", links: [["/termos", "Termos de uso"], ["/privacidade", "Privacidade (LGPD)"], ["/cookies", "Cookies"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">Recrutamento com IA e com gente: vagas grátis para empresas, triagem inteligente e recrutadoras especialistas quando a vaga pede.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="text-sm font-bold text-ink">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.links.map(([href, label]) => (
                <li key={href}><Link href={href} className="text-sm text-muted hover:text-brand">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">© {new Date().getFullYear()} VagaLoop. A decisão de contratação é sempre humana; a IA só ajuda a priorizar.</p>
      </div>
    </footer>
  );
}
