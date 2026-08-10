/**
 * Job type registry.
 * ---------------------------------------------------------------------------
 * Defines every background job's name + payload shape in one place, and
 * exposes a typed `enqueueJob()` helper so callers get autocomplete +
 * type-checking on the payload for whichever job name they pass.
 *
 * Adding a new job type:
 *   1. Add its name + payload type to `JobRegistry` below.
 *   2. Add a matching `case` in src/worker/index.ts's processor switch.
 *   3. Call `enqueueJob("your-job-name", { ...payload })` from anywhere.
 */

import type { JobsOptions } from "bullmq";
import { getJobQueue } from "@/lib/queue/queues";

/**
 * Every known job name mapped to its payload type. The worker's processor
 * switches on `job.name`, and this map is the single source of truth for
 * what each job name means.
 */
export type JobRegistry = {
  /** Liveness ping — proves the worker process is alive. Runs every minute. */
  heartbeat: Record<string, never>;
  /** Generates the daily briefing summary. Stub until Phase 14. Runs 8 AM UTC. */
  "daily-briefing": Record<string, never>;
  /** Upserts a Clerk user into the database (webhook fallback / manual sync). */
  "sync-user": { clerkId: string; email: string; name?: string | null };
};

export type JobName = keyof JobRegistry;

/**
 * Enqueues a job onto the shared "jarvis" queue with full type-safety on
 * the payload for the given job name.
 *
 * Usage:
 *   await enqueueJob("sync-user", { clerkId, email, name });
 */
export async function enqueueJob<TName extends JobName>(
  name: TName,
  data: JobRegistry[TName],
  opts?: JobsOptions,
) {
  const queue = getJobQueue();
  return queue.add(name, data, opts);
}

/**
 * Registers the two recurring (cron) jobs via BullMQ's job scheduler API
 * (`upsertJobScheduler` — BullMQ v6 replaced the old `add(..., { repeat })`
 * option with this explicit scheduler concept). `upsertJobScheduler` is an
 * upsert keyed by scheduler id, so calling this on every worker boot updates
 * the existing schedule instead of creating duplicates.
 */
export async function registerScheduledJobs() {
  const queue = getJobQueue();

  await queue.upsertJobScheduler(
    "scheduled-heartbeat",
    { pattern: "* * * * *" },
    { name: "heartbeat", data: {} },
  );

  await queue.upsertJobScheduler(
    "scheduled-daily-briefing",
    { pattern: "0 8 * * *" },
    { name: "daily-briefing", data: {} },
  );
}
