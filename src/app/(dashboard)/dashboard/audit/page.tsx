import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditLogView } from "@/components/audit/audit-log-view";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function AuditLogPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const allowed = await hasRole("MANAGER");
  if (!allowed) redirect("/dashboard");

  const logs = await db.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const initialLogs = logs.map((log: (typeof logs)[number]) => ({
    id: log.id as string,
    action: log.action as string,
    status: log.status as string,
    payload: log.payload,
    createdAt: new Date(log.createdAt as Date).toISOString(),
    user: log.user
      ? { name: log.user.name, email: log.user.email as string }
      : null,
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 8 — Human-in-the-Loop Approvals
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Audit Logs
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Every tool the Hermes agent has run, requested approval for, or had
            approved/rejected — most recent first.
          </p>
        </div>

        <AuditLogView
          initialLogs={initialLogs}
          initialNextCursor={
            logs.length === 50 ? logs[logs.length - 1]!.id : null
          }
        />
      </div>
    </div>
  );
}
