import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateDraftReply } from "@/lib/support/draft";

export const dynamic = "force-dynamic";

/**
 * POST /api/support/tickets/:id/draft
 * Generates an AI-drafted reply via Gemini, based on the full thread so
 * far. Returned as plain text for the agent to review/edit — never sent
 * automatically.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages = (ticket as any).messages.map((m: any) => ({
      id: m.id,
      author: m.author,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));

    const draft = await generateDraftReply({
      subject: ticket.subject,
      customer: ticket.customer,
      priority: ticket.priority,
      messages,
    });

    return NextResponse.json({ draft });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to generate a draft reply.",
      },
      { status: 502 },
    );
  }
}
