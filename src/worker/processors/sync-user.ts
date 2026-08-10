/**
 * Sync-user processor — upserts a Clerk user into the database.
 *
 * This is a fallback path: in production, the Clerk webhook
 * (`/api/webhooks/clerk`) creates/updates the User row synchronously and
 * `getCurrentDbUser()` handles it inline too. This job exists so any future
 * caller (e.g. a bulk re-sync admin action, or a webhook retry path) can
 * push the work onto the queue instead of blocking a request.
 */

import type { Job } from "bullmq";
import { db } from "@/lib/db";
import type { JobRegistry } from "@/lib/queue/jobs";

export async function processSyncUser(
  job: Job<JobRegistry["sync-user"]>,
): Promise<{ userId: string }> {
  const { clerkId, email, name } = job.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ clerkId }, { email }] },
  });

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: { clerkId, email, name: name ?? existing.name },
      })
    : await db.user.create({
        data: {
          clerkId,
          email,
          name: name ?? null,
          role: (await db.user.count()) === 0 ? "ADMIN" : "VIEWER",
        },
      });

  console.log(`[worker] sync-user ok — job #${job.id} user ${user.id}`);

  return { userId: user.id as string };
}
