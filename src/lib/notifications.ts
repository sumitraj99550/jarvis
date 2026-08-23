/**
 * Notifications (Phase 18) — real, DB-backed, triggered by genuine events
 * elsewhere in the app (task due-date reminders, approval requests, ticket
 * assignment, daily briefings) rather than a standalone feature with
 * nothing feeding it.
 */

import { db } from "@/lib/db";

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "TASK"
  | "APPROVAL"
  | "BRIEFING"
  | "TICKET";

export async function createNotification(input: {
  userId: string;
  title: string;
  body?: string;
  type?: NotificationType;
  link?: string;
}) {
  return db.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type ?? "INFO",
      link: input.link,
    },
  });
}

/** Notifies every user in the system — used for org-wide events like a new daily briefing. */
export async function createNotificationForAllUsers(input: {
  title: string;
  body?: string;
  type?: NotificationType;
  link?: string;
}) {
  const users = await db.user.findMany({ select: { id: true } });
  if (users.length === 0) return;
  await db.notification.createMany({
    data: users.map((u: { id: string }) => ({
      userId: u.id,
      title: input.title,
      body: input.body,
      type: input.type ?? "INFO",
      link: input.link,
    })),
  });
}
