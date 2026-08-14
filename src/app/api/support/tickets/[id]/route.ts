import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/support/tickets/:id — ticket + full message thread. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;

  const row = await db.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;

  return NextResponse.json({
    ticket: {
      id: r.id,
      subject: r.subject,
      customer: r.customer,
      customerEmail: r.customerEmail,
      status: r.status,
      priority: r.priority,
      resolution: r.resolution ?? null,
      assignedToId: r.assignedToId ?? null,
      assignedToName: r.assignedTo?.name ?? r.assignedTo?.email ?? null,
      messageCount: r.messages.length,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: r.messages.map((m: any) => ({
      id: m.id,
      author: m.author,
      content: m.content,
      createdAt: new Date(m.createdAt).toISOString(),
    })),
  });
}
