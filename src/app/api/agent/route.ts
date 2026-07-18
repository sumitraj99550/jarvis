import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { HermesAgent } from "@/lib/hermes/agent";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ChatTurn } from "@/lib/ai";
import type { AgentEvent } from "@/lib/hermes/types";

const MAX_CONTEXT_TURNS = 10;
const MAX_MESSAGE_LENGTH = 4000;

const enc = new TextEncoder();

/** Serialise any AgentEvent to an SSE data line */
function sse(event: AgentEvent): Uint8Array {
  return enc.encode(`data: ${JSON.stringify(event)}\n\n`);
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
  // 2. API key guard
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
  // 3. Parse body
  // -------------------------------------------------------------------------
  let message: string;
  try {
    const body = (await req.json()) as { message?: unknown };
    if (typeof body.message !== "string" || !body.message.trim()) {
      throw new Error("Invalid");
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
  // 4. Load conversation history
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
  // 5. Run Hermes agent, streaming events to the client
  // -------------------------------------------------------------------------
  const agent = new HermesAgent(process.env.GOOGLE_AI_API_KEY);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // The agent calls onEvent for every status / tool / chunk update.
        // We forward each event straight to the SSE stream.
        const { finalText, tools } = await agent.run(
          message,
          contextTurns,
          { userId: user.id },
          (event) => controller.enqueue(sse(event)),
        );

        // Stream the final text response in small chunks for a typing effect
        const CHUNK_SIZE = 6; // characters per SSE chunk
        for (let i = 0; i < finalText.length; i += CHUNK_SIZE) {
          controller.enqueue(
            sse({
              type: "chunk",
              content: finalText.slice(i, i + CHUNK_SIZE),
            }),
          );
          // Tiny delay — gives the browser a chance to paint each chunk
          await new Promise((r) => setTimeout(r, 12));
        }

        // Persist the completed conversation turn
        const saved = await db.conversation.create({
          data: { userId: user.id, message, response: finalText },
        });

        // Audit log for tool usage (Phase 8 will expand this)
        if (tools.length > 0) {
          await db.auditLog.create({
            data: {
              userId: user.id,
              action: `hermes.${tools.map((t) => t.name).join("+")}`,
              payload: { message, tools },
              status: "executed",
            },
          });
        }

        controller.enqueue(sse({ type: "done", id: saved.id, tools }));
      } catch (err) {
        console.error("[api/agent] error:", err);
        controller.enqueue(
          sse({
            type: "error",
            message: err instanceof Error ? err.message : "Agent run failed.",
          }),
        );
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
      "X-Accel-Buffering": "no",
    },
  });
}
