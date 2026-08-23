import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TasksView } from "@/components/tasks/tasks-view";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function TasksPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const rows = await db.task.findMany({
    where: { userId: user.id },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const tasks = rows.map((t: (typeof rows)[number]) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 18 — Task Management
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Tasks
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Due-date reminders are sent as real notifications by the background
            worker, hourly.
          </p>
        </div>

        <TasksView initialTasks={tasks} />
      </div>
    </div>
  );
}
