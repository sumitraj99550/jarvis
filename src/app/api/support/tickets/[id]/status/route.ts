import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/support/types";
import type { TicketPriority, TicketStatus } from "@/lib/support/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/support/tickets/:id/status
 * Body: { status?, priority?, assignToMe?, resolution? }
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

  let status: TicketStatus | undefined;
  let priority: TicketPriority | undefined;
  let assignToMe = false;
  let resolution: string | undefined;

  try {
    const body = (await req.json()) as {
      status?: unknown;
      priority?: unknown;
      assignToMe?: unknown;
      resolution?: unknown;
    };

    if (body.status !== undefined) {
      if (!TICKET_STATUSES.includes(body.status as TicketStatus)) {
        throw new Error(
          `'status' must be one of: ${TICKET_STATUSES.join(", ")}`,
        );
      }
      status = body.status as TicketStatus;
    }
    if (body.priority !== undefined) {
      if (!TICKET_PRIORITIES.includes(body.priority as TicketPriority)) {
        throw new Error(
          `'priority' must be one of: ${TICKET_PRIORITIES.join(", ")}`,
        );
      }
      priority = body.priority as TicketPriority;
    }
    if (body.assignToMe === true) assignToMe = true;
    if (body.resolution !== undefined) {
      if (typeof body.resolution !== "string") {
        throw new Error("'resolution' must be a string.");
      }
      resolution = body.resolution;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const existing = await db.ticket.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const ticket = await db.ticket.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assignToMe ? { assignedToId: user.id } : {}),
      ...(resolution !== undefined ? { resolution } : {}),
    },
    include: { assignedTo: true },
  });

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      status: ticket.status,
      priority: ticket.priority,
      resolution: ticket.resolution ?? null,
      assignedToId: ticket.assignedToId ?? null,
      assignedToName:
        ticket.assignedTo?.name ?? ticket.assignedTo?.email ?? null,
    },
  });
}
