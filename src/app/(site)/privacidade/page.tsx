import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";
import { getPublicSettings } from "@/lib/public-data";

export const metadata: Metadata = { title: "Política de privacidade (LGPD)", alternates: { canonical: "/privacidade" } };

export default async function Privacidade() {
  const s = await getPublicSettings();
  return (
    <LegalPage title="Política de privacidade" updated={s.terms_version}>
      <p>Explicamos aqui quais dados pessoais tratamos, para quê e como você exerce seus direitos, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
      <h2>Dados que tratamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail, senha (criptografada) e tipo de conta.</li>
        <li>Candidatos: currículo, experiências, formação, habilidades, pretensão salarial, preferências e respostas de triagem. Informação de PCD é opcional e usada só para vagas afirmativas, nunca no cálculo de aderência.</li>
        <li>Empresas: CNPJ, dados da empresa e dos usuários do time.</li>
        <li>Uso: registros técnicos de acesso, por segurança.</li>
      </ul>
      <h2>Finalidades e bases legais</h2>
      <ul>
        <li>Participar de processos seletivos: execução de contrato e consentimento do candidato.</li>
        <li>Calcular aderência entre perfil e vaga com IA: legítimo interesse e consentimento, com revisão humana garantida.</li>
        <li>Enviar avisos sobre suas candidaturas: execução de contrato.</li>
        <li>Alertas de vagas e comunicações de marketing: consentimento, revogável a qualquer momento.</li>
      </ul>
      <h2>Compartilhamento</h2>
      <p>A empresa de uma vaga vê o perfil profissional de quem se candidatou a ela. E-mail, telefone e o arquivo original do currículo só são liberados para a empresa depois da contratação. Usamos fornecedores de infraestrutura, e-mail e IA sob contrato, sem autorização para usar seus dados para fins próprios.</p>
      <h2>Decisões automatizadas</h2>
      <p>O índice de aderência não decide nada sozinho. Você pode pedir revisão e explicação dos critérios pelo contato abaixo.</p>
      <h2>Retenção</h2>
      <p>Mantemos dados de candidatos inativos por até {s.data_retention_months} meses; depois anonimizamos ou excluímos. Registros exigidos por lei são mantidos pelo prazo legal.</p>
      <h2>Seus direitos</h2>
      <ul>
        <li>Confirmar e acessar seus dados, e exportá-los em formato legível (na área do candidato, em Privacidade).</li>
        <li>Corrigir, anonimizar ou excluir dados, e excluir a conta (também na área logada).</li>
        <li>Revogar consentimentos e se opor a tratamentos.</li>
      </ul>
      <h2>Encarregado (DPO)</h2>
      <p>Fale com nosso encarregado pelo e-mail <strong>{s.dpo_contact}</strong>.</p>
    </LegalPage>
  );
}
