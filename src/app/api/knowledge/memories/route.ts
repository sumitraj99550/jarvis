import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { listMemories, rememberFact } from "@/lib/knowledge/memory";

export const dynamic = "force-dynamic";

/** GET /api/knowledge/memories */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const memories = await listMemories(user.id);
  return NextResponse.json({ memories });
}

/** POST /api/knowledge/memories — Body: { content: string } */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let content: string;
  try {
    const body = (await req.json()) as { content?: unknown };
    if (typeof body.content !== "string" || !body.content.trim()) {
      throw new Error("'content' is required.");
    }
    content = body.content.trim();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const memory = await rememberFact(user.id, content);
  return NextResponse.json({ memory }, { status: 201 });
}
