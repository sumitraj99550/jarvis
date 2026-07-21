import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { HermesAgent } from "@/lib/hermes/agent";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ChatTurn } from "@/lib/ai";
import type { AgentEvent, PendingApprovalData } from "@/lib/hermes/types";

const MAX_CONTEXT_TURNS = 10;
const MAX_MESSAGE_LENGTH = 4000;

const enc = new TextEncoder();

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

  if (!process.env.GOOGLE_AI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // -------------------------------------------------------------------------
  // 2. Parse body
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
  // 3. Load conversation history
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
  // 4. Run Hermes agent with SSE streaming
  // -------------------------------------------------------------------------
  const agent = new HermesAgent(process.env.GOOGLE_AI_API_KEY);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { finalText, tools, pendingApproval } = await agent.run(
          message,
          contextTurns,
          { userId: user.id },
          (event) => controller.enqueue(sse(event)),
        );

        // -------------------------------------------------------------------
        // Phase 8: High-risk tool detected — pause for human approval
        // -------------------------------------------------------------------
        if (pendingApproval) {
          const data = pendingApproval as PendingApprovalData;

          // Persist the pending action so the approve route can resume it
          const auditLog = await db.auditLog.create({
            data: {
              userId: user.id,
              action: `hermes.${data.toolName}`,
              payload: data as unknown as Record<string, unknown>,
              status: "pending_approval",
            },
          });

          controller.enqueue(
            sse({
              type: "approval_required",
              auditLogId: auditLog.id,
              toolName: data.toolName,
              toolLabel: data.toolLabel,
              riskLevel: data.riskLevel,
              description: data.description,
              args: data.args,
            }),
          );

          // Stream ends here — no `done` event.
          // The client shows the ApprovalCard; the conversation resumes
          // when the user clicks Approve or Reject.
          controller.close();
          return;
        }

        // -------------------------------------------------------------------
        // Normal completion — stream final response and close
        // -------------------------------------------------------------------
        const CHUNK_SIZE = 6;
        for (let i = 0; i < finalText.length; i += CHUNK_SIZE) {
          controller.enqueue(
            sse({ type: "chunk", content: finalText.slice(i, i + CHUNK_SIZE) }),
          );
          await new Promise((r) => setTimeout(r, 12));
        }

        const saved = await db.conversation.create({
          data: { userId: user.id, message, response: finalText },
        });

        if (tools.length > 0) {
          await db.auditLog.create({
            data: {
              userId: user.id,
              action: `hermes.${tools.map((t) => t.name).join("+")}`,
              payload: { message, tools } as unknown as Record<string, unknown>,
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
