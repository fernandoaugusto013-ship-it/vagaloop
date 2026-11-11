import { NextResponse } from "next/server";
import { isDemo } from "@/lib/env";
import { getSession } from "@/lib/auth";

export async function GET() {
  if (!isDemo) return NextResponse.json(null, { status: 404 });
  const s = await getSession();
  return NextResponse.json({ role: s?.profile.role ?? null }, { headers: { "cache-control": "no-store" } });
}
