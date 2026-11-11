import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.profile.role !== "candidate") return NextResponse.json({ error: "login necessário" }, { status: 401 });
  const { data, error } = await session.supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "falha ao exportar" }, { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="vagaloop-meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
