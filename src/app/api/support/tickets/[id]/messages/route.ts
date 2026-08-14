import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/support/tickets/:id/messages
 * Body: { content: string }
 * Sends an agent reply — moves the ticket to PENDING (awaiting customer)
 * if it was OPEN.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;

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

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const message = await db.ticketMessage.create({
    data: { ticketId: id, author: "AGENT", content },
  });

  await db.ticket.update({
    where: { id },
    data: {
      status: ticket.status === "OPEN" ? "PENDING" : ticket.status,
    },
  });

  return NextResponse.json(
    {
      message: {
        id: message.id,
        author: message.author,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
