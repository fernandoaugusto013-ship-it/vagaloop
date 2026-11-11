import { NextResponse, type NextRequest } from "next/server";
import { listJobs, parseFilters } from "@/lib/public-data";

export async function GET(req: NextRequest) {
  const f = parseFilters(Object.fromEntries(req.nextUrl.searchParams));
  const data = await listJobs(f);
  return NextResponse.json(data, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
