import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/briefings — most recent briefings, newest first. */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const briefings = await db.briefing.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    briefings: (briefings as any[]).map((b) => ({
      id: b.id,
      summary: b.summary,
      stats: b.stats,
      createdAt: new Date(b.createdAt).toISOString(),
    })),
  });
}
