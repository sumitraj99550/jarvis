import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { createDocument, listDocuments } from "@/lib/knowledge/documents";

export const dynamic = "force-dynamic";

/** GET /api/knowledge/documents */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const documents = await listDocuments(user.id);
  return NextResponse.json({ documents });
}

/**
 * POST /api/knowledge/documents
 * Body: { title: string, content: string }
 * Creates the document immediately, then embeds it (real Gemini call).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let title: string;
  let content: string;
  try {
    const body = (await req.json()) as { title?: unknown; content?: unknown };
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new Error("'title' is required.");
    }
    if (typeof body.content !== "string" || !body.content.trim()) {
      throw new Error("'content' is required.");
    }
    title = body.title.trim();
    content = body.content.trim();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const { document, embeddingError } = await createDocument(
    user.id,
    title,
    content,
  );

  return NextResponse.json({ document, embeddingError }, { status: 201 });
}
