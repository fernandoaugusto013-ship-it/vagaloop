/** Valida CNPJ numérico (14 dígitos) pelos dígitos verificadores. */
export function isValidCnpj(input: string) {
  const c = input.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(c[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export const formatCnpj = (c: string) =>
  c.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");

export type CnpjData = { legal_name: string; trade_name: string | null; city: string | null; uf: string | null; size: string | null };

/** Autopreenchimento pela BrasilAPI (pública, sem chave). Falha silenciosa: o usuário digita à mão. */
export async function lookupCnpj(cnpj: string): Promise<CnpjData | null> {
  const c = cnpj.replace(/\D/g, "");
  if (!isValidCnpj(c)) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      legal_name: d.razao_social ?? "",
      trade_name: d.nome_fantasia || null,
      city: d.municipio ? titleCase(d.municipio) : null,
      uf: d.uf ?? null,
      size: null,
    };
  } catch {
    return null;
  }
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_m, sp: string, ch: string) => sp + ch.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos)\b/g, (w) => w.toLowerCase());
