import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { recallMemories } from "@/lib/knowledge/memory";

export const dynamic = "force-dynamic";

/** POST /api/knowledge/memories/search — Body: { query: string } */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let query: string;
  try {
    const body = (await req.json()) as { query?: unknown };
    if (typeof body.query !== "string" || !body.query.trim()) {
      throw new Error("'query' is required.");
    }
    query = body.query.trim();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const results = await recallMemories(user.id, query);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed." },
      { status: 502 },
    );
  }
}
