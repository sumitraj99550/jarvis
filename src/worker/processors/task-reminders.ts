/**
 * Task reminders processor — runs hourly via the "task-reminders"
 * repeatable job (Phase 18).
 *
 * Finds tasks due within the next 24 hours that haven't already had a
 * reminder sent, creates a real notification for the task's owner, and
 * marks `reminderSentAt` so it's never sent twice.
 */

import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function processTaskReminders(
  job: Job,
): Promise<{ remindersSent: number }> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const dueSoon = await db.task.findMany({
    where: {
      dueDate: { gte: now, lte: in24h },
      reminderSentAt: null,
      status: { notIn: ["DONE", "CANCELLED"] },
    },
  });

  for (const task of dueSoon as Array<{
    id: string;
    title: string;
    userId: string;
    dueDate: Date | null;
  }>) {
    await createNotification({
      userId: task.userId,
      title: "Task due soon",
      body: task.title,
      type: "TASK",
      link: "/dashboard/tasks",
    });
    await db.task.update({
      where: { id: task.id },
      data: { reminderSentAt: now },
    });
  }

  console.log(
    `[worker] task-reminders — job #${job.id} sent ${dueSoon.length} reminder(s)`,
  );

  return { remindersSent: dueSoon.length };
}
