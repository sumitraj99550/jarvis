/**
 * Heartbeat processor — runs every minute via the "heartbeat" repeatable job.
 *
 * Its only purpose is to prove the worker process is alive and connected to
 * Redis + the database. `/api/queue/status` reports the timestamp of the
 * most recent heartbeat so the dashboard can show "Background Jobs:
 * Operational" instead of "Pending".
 */

import type { Job } from "bullmq";
import { db } from "@/lib/db";

export async function processHeartbeat(job: Job): Promise<{ at: string }> {
  const at = new Date().toISOString();

  // Cheap DB round-trip so the heartbeat also proves the DB connection
  // (via the driver adapter pool) is healthy, not just Redis.
  await db.user.count();

  console.log(`[worker] heartbeat ok — job #${job.id} at ${at}`);

  return { at };
}
