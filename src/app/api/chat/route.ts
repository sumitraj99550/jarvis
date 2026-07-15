import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { anthropic, JARVIS_SYSTEM_PROMPT, CLAUDE_MODEL } from "@/lib/anthropic";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Maximum number of previous turns to include as context for Claude */
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
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to .env.local and restart the server.",
      },
      { status: 503 },
    );
  }

  // -------------------------------------------------------------------------
  // 4. Load recent conversation history for context
  // -------------------------------------------------------------------------
  const history = await db.conversation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: MAX_CONTEXT_TURNS,
  });

  // Build the Claude messages array: flatten (user, assistant) pairs
  const contextMessages: { role: "user" | "assistant"; content: string }[] =
    history.flatMap((turn: { message: string; response: string | null }) => [
      { role: "user" as const, content: turn.message },
      ...(turn.response
        ? [{ role: "assistant" as const, content: turn.response }]
        : []),
    ]);

  // Append the current user message
  const claudeMessages = [
    ...contextMessages,
    { role: "user" as const, content: message },
  ];

  // -------------------------------------------------------------------------
  // 5. Call Claude
  // -------------------------------------------------------------------------
  let responseText: string;
  try {
    const completion = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: JARVIS_SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    // The first content block is the text response
    const block = completion.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Unexpected response structure from Claude API.");
    }
    responseText = block.text;
  } catch (err) {
    console.error("[api/chat] Claude API error:", err);
    const message =
      err instanceof Error ? err.message : "Claude API call failed.";
    return NextResponse.json({ error: message }, { status: 502 });
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
