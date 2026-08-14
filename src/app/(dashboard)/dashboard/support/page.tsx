import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TicketListView } from "@/components/support/ticket-list-view";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

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

export default async function SupportPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const rows = await db.ticket.findMany({
    include: { assignedTo: true, _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 13 — Customer Support Agent
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Support Center
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Tickets, threaded replies, and AI-drafted responses powered by the
            same Gemini engine as Command Center.
          </p>
        </div>

        <TicketListView initialTickets={rows.map(toTicketDTO)} />
      </div>
    </div>
  );
}
