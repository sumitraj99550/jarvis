import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/support/types";
import type { TicketPriority, TicketStatus } from "@/lib/support/types";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTicketDTO(row: any) {
  return {
    id: row.id,
    subject: row.subject,
    customer: row.customer,
    customerEmail: row.customerEmail,
    status: row.status,
    priority: row.priority,
    resolution: row.resolution ?? null,
    assignedToId: row.assignedToId ?? null,
    assignedToName: row.assignedTo?.name ?? row.assignedTo?.email ?? null,
    messageCount: row._count?.messages ?? 0,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

/** GET /api/support/tickets?status=&priority= — list all tickets (support queue is shared across the team). */
export async function GET(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const priorityParam = req.nextUrl.searchParams.get("priority");
  const status = TICKET_STATUSES.includes(statusParam as TicketStatus)
    ? (statusParam as TicketStatus)
    : undefined;
  const priority = TICKET_PRIORITIES.includes(priorityParam as TicketPriority)
    ? (priorityParam as TicketPriority)
    : undefined;

  const rows = await db.ticket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
    include: { assignedTo: true, _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ tickets: rows.map(toTicketDTO) });
}

/**
 * POST /api/support/tickets
 * Body: { subject, customer, customerEmail, priority?, message }
 * Creates a ticket and its opening customer message.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let subject: string;
  let customer: string;
  let customerEmail: string;
  let priority: TicketPriority;
  let message: string;

  try {
    const body = (await req.json()) as {
      subject?: unknown;
      customer?: unknown;
      customerEmail?: unknown;
      priority?: unknown;
      message?: unknown;
    };

    if (typeof body.subject !== "string" || !body.subject.trim()) {
      throw new Error("'subject' is required.");
    }
    if (typeof body.customer !== "string" || !body.customer.trim()) {
      throw new Error("'customer' is required.");
    }
    if (
      typeof body.customerEmail !== "string" ||
      !body.customerEmail.includes("@")
    ) {
      throw new Error("'customerEmail' must be a valid email.");
    }
    if (typeof body.message !== "string" || !body.message.trim()) {
      throw new Error("'message' is required.");
    }

    subject = body.subject.trim();
    customer = body.customer.trim();
    customerEmail = body.customerEmail.trim();
    message = body.message.trim();
    priority = TICKET_PRIORITIES.includes(body.priority as TicketPriority)
      ? (body.priority as TicketPriority)
      : "MEDIUM";
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const ticket = await db.ticket.create({
    data: {
      subject,
      customer,
      customerEmail,
      priority,
      messages: { create: { author: "CUSTOMER", content: message } },
    },
    include: { assignedTo: true, _count: { select: { messages: true } } },
  });

  return NextResponse.json({ ticket: toTicketDTO(ticket) }, { status: 201 });
}
