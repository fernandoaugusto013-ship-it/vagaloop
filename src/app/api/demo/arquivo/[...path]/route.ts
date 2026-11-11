import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDemo } from "@/lib/env";
import { DEMO_COOKIE } from "@/lib/supabase/server";
import { canRead, demoFiles, type Who } from "@/lib/demo/client";
import { getDemoDb } from "@/lib/demo/db";

/** Serve arquivos do storage da demo, conferindo o mesmo RLS de storage.objects. */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!isDemo) return new NextResponse(null, { status: 404 });
  const [bucket, ...rest] = (await params).path;
  const path = rest.join("/");
  const file = demoFiles.get(`${bucket}/${path}`);
  if (!file) return new NextResponse(null, { status: 404 });
  if (bucket !== "logos") {
    const id = (await cookies()).get(DEMO_COOKIE)?.value;
    const db = await getDemoDb();
    const u = id ? (await db.query<{ email: string }>(`select email from auth.users where id = $1`, [id])).rows[0] : null;
    const who: Who = u && id ? { kind: "user", id, email: u.email } : { kind: "anon" };
    if (!(await canRead(who, bucket, path))) return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(Buffer.from(file.bytes), { headers: { "content-type": file.type, "cache-control": "private, no-store" } });
}
