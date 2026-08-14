import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TicketDetailView } from "@/components/support/ticket-detail-view";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const row = await db.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!row) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;

  const ticket = {
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
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = r.messages.map((m: any) => ({
    id: m.id,
    author: m.author,
    content: m.content,
    createdAt: new Date(m.createdAt).toISOString(),
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <TicketDetailView initialTicket={ticket} initialMessages={messages} />
      </div>
    </div>
  );
}
