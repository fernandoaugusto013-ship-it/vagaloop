import { NextResponse } from "next/server";
import { isValidCnpj, lookupCnpj } from "@/lib/cnpj";
import { getSession } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ cnpj: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: "login necessário" }, { status: 401 });
  const { cnpj } = await params;
  if (!isValidCnpj(cnpj)) return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  const data = await lookupCnpj(cnpj);
  return data ? NextResponse.json(data) : NextResponse.json({ error: "Não encontrado" }, { status: 404 });
}
