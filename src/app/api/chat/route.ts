import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { streamMessage, type ChatTurn } from "@/lib/ai";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

const MAX_CONTEXT_TURNS = 10;
const MAX_MESSAGE_LENGTH = 4000;

/**
 * SSE event helpers
 *
 * Every event is a single `data:` line followed by two newlines, which is
 * the standard Server-Sent Events wire format. The client's ReadableStream
 * reader splits on `\n\n` to parse individual events.
 */
const enc = new TextEncoder();

function sseChunk(chunk: string): Uint8Array {
  return enc.encode(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
}

function sseDone(id: string): Uint8Array {
  return enc.encode(`data: ${JSON.stringify({ done: true, id })}\n\n`);
}

function sseError(message: string): Uint8Array {
  return enc.encode(
    `data: ${JSON.stringify({ error: message, done: true })}\n\n`,
  );
}

export async function POST(req: NextRequest) {
  // -------------------------------------------------------------------------
  // 1. Auth
  // -------------------------------------------------------------------------
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthenticated." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await getCurrentDbUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // -------------------------------------------------------------------------
  // 2. Validate body
  // -------------------------------------------------------------------------
  let message: string;
  try {
    const body = (await req.json()) as { message?: unknown };
    if (typeof body.message !== "string" || !body.message.trim()) {
      throw new Error("Invalid message");
    }
    message = body.message.trim();
  } catch {
    return new Response(
      JSON.stringify({ error: "'message' must be a non-empty string." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `Message exceeds ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // -------------------------------------------------------------------------
  // 3. Guard: API key
  // -------------------------------------------------------------------------
  if (!process.env.GOOGLE_AI_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "GOOGLE_AI_API_KEY is not configured. " +
          "Get a free key at https://aistudio.google.com/apikey",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // -------------------------------------------------------------------------
  // 4. Load conversation history for context
  // -------------------------------------------------------------------------
  const history = await db.conversation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: MAX_CONTEXT_TURNS,
  });

  const contextTurns: ChatTurn[] = history.flatMap(
    (row: { message: string; response: string | null }) => [
      { role: "user" as const, content: row.message },
      ...(row.response
        ? [{ role: "assistant" as const, content: row.response }]
        : []),
    ],
  );

  // -------------------------------------------------------------------------
  // 5. Stream Gemini response via SSE
  // -------------------------------------------------------------------------
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";

      try {
        const chunks = await streamMessage(message, contextTurns);

        for await (const chunk of chunks) {
          fullText += chunk;
          controller.enqueue(sseChunk(chunk));
        }

        // Persist the completed turn
        const saved = await db.conversation.create({
          data: { userId: user.id, message, response: fullText },
        });

        controller.enqueue(sseDone(saved.id));
      } catch (err) {
        console.error("[api/chat] stream error:", err);
        const msg = err instanceof Error ? err.message : "AI stream failed.";
        controller.enqueue(sseError(msg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tell proxies/nginx not to buffer the stream
      "X-Accel-Buffering": "no",
    },
  });
}
