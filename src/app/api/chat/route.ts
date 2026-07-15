import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { sendMessage, type ChatTurn } from "@/lib/ai";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Previous turns to include as context (each turn = 1 user msg + 1 AI reply) */
const MAX_CONTEXT_TURNS = 10;

/** Maximum characters in a single user message */
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: NextRequest) {
  // -------------------------------------------------------------------------
  // 1. Authentication
  // -------------------------------------------------------------------------
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  // -------------------------------------------------------------------------
  // 2. Parse and validate the request body
  // -------------------------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  const message =
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as Record<string, unknown>).message === "string"
      ? ((body as Record<string, unknown>).message as string).trim()
      : null;

  if (!message) {
    return NextResponse.json(
      { error: "Field 'message' is required and must be a non-empty string." },
      { status: 400 },
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        error: `Message exceeds the ${MAX_MESSAGE_LENGTH.toLocaleString()}-character limit.`,
      },
      { status: 400 },
    );
  }

  // -------------------------------------------------------------------------
  // 3. Guard: API key must be configured
  // -------------------------------------------------------------------------
  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_AI_API_KEY is not configured. " +
          "Get a free key at https://aistudio.google.com/apikey " +
          "and add it to .env.local, then restart the server.",
      },
      { status: 503 },
    );
  }

  // -------------------------------------------------------------------------
  // 4. Load recent conversation history for multi-turn context
  // -------------------------------------------------------------------------
  const history = await db.conversation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: MAX_CONTEXT_TURNS,
  });

  // Convert DB rows → ChatTurn format expected by sendMessage()
  const contextTurns: ChatTurn[] = history.flatMap(
    (row: { message: string; response: string | null }) => [
      { role: "user" as const, content: row.message },
      ...(row.response
        ? [{ role: "assistant" as const, content: row.response }]
        : []),
    ],
  );

  // -------------------------------------------------------------------------
  // 5. Call Gemini
  // -------------------------------------------------------------------------
  let responseText: string;
  try {
    responseText = await sendMessage(message, contextTurns);
  } catch (err) {
    console.error("[api/chat] Gemini API error:", err);
    const msg = err instanceof Error ? err.message : "AI API call failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // -------------------------------------------------------------------------
  // 6. Persist the conversation turn
  // -------------------------------------------------------------------------
  const saved = await db.conversation.create({
    data: {
      userId: user.id,
      message,
      response: responseText,
    },
  });

  // -------------------------------------------------------------------------
  // 7. Return the response
  // -------------------------------------------------------------------------
  return NextResponse.json({
    id: saved.id,
    response: responseText,
    createdAt: saved.createdAt.toISOString(),
  });
}
