import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal";
import { getPublicSettings } from "@/lib/public-data";

export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: "/termos" } };

export default async function Termos() {
  const s = await getPublicSettings();
  return (
    <LegalPage title="Termos de uso" updated={s.terms_version}>
      <p>Estes termos regem o uso da VagaLoop por empresas, candidatos e recrutadoras. Ao criar uma conta, você concorda com eles e com a <Link href="/privacidade" className="font-semibold text-brand">Política de Privacidade</Link>.</p>
      <h2>1. O serviço</h2>
      <p>A VagaLoop oferece publicação gratuita de vagas, ferramentas de triagem com apoio de IA, um serviço gerenciado de recrutamento conduzido por recrutadoras especialistas e um programa de assinatura para recrutadoras.</p>
      <h2>2. Contas</h2>
      <ul><li>Você é responsável pela veracidade dos dados e pela segurança da sua senha.</li><li>Empresas declaram ter poderes para representar a pessoa jurídica cadastrada.</li><li>Podemos suspender contas que violem estes termos ou a lei.</li></ul>
      <h2>3. Vagas</h2>
      <ul><li>É proibido publicar vagas falsas, com cobrança de taxas do candidato, ou com requisitos discriminatórios (idade, gênero, raça, religião, estado civil, aparência, deficiência, entre outros), salvo hipóteses previstas em lei, como vagas afirmativas.</li><li>Vagas podem ser moderadas e suspensas.</li><li>Vagas confidenciais não exibem o nome da empresa ao público.</li></ul>
      <h2>4. Uso da IA</h2>
      <p>O índice de aderência e as justificativas geradas são apoio à decisão e podem conter erros. A decisão sobre cada candidato é sempre de uma pessoa da empresa ou da recrutadora responsável.</p>
      <h2>5. Contato com candidatos</h2>
      <p>O contato do candidato (e-mail, telefone e o arquivo original do currículo) fica protegido até a contratação. As comunicações anteriores acontecem pela plataforma.</p>
      <h2>6. Serviço gerenciado e assinaturas</h2>
      <p>Valores, prazos de garantia e condições comerciais são apresentados na proposta ou na página do plano antes da contratação.</p>
      <h2>7. Responsabilidades</h2>
      <p>A VagaLoop não é parte da relação de trabalho entre empresa e candidato e não garante contratações ou ganhos.</p>
      <h2>8. Contato</h2>
      <p>Dúvidas sobre estes termos: {s.dpo_contact}.</p>
    </LegalPage>
  );
}
