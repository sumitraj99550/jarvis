/**
 * JARVIS background worker — a separate Node.js process from the Next.js app.
 * ---------------------------------------------------------------------------
 * Run with:
 *   npm run worker        (one-shot)
 *   npm run worker:dev    (auto-restart on file change, via tsx watch)
 *
 * Responsibilities:
 *   1. Register the two recurring (cron) jobs on boot — heartbeat every
 *      minute, daily-briefing at 8 AM UTC. BullMQ dedupes repeatable jobs
 *      by jobId, so this is safe to run on every restart.
 *   2. Start a BullMQ Worker listening on the "jarvis" queue, concurrency 5,
 *      dispatching each job to its processor by `job.name`.
 *   3. Log job lifecycle events (completed/failed) to the console.
 *   4. Shut down gracefully on SIGINT/SIGTERM so in-flight jobs finish
 *      instead of being killed mid-write.
 *
 * This file loads its own .env — it does NOT run inside Next.js, so none of
 * Next's automatic env loading applies here.
 */

import "dotenv/config";
import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";
import { JARVIS_QUEUE_NAME, registerScheduledJobs } from "@/lib/queue";
import { processHeartbeat } from "@/worker/processors/heartbeat";
import { processDailyBriefing } from "@/worker/processors/daily-briefing";
import { processSyncUser } from "@/worker/processors/sync-user";

async function processor(job: Job) {
  switch (job.name) {
    case "heartbeat":
      return processHeartbeat(job);
    case "daily-briefing":
      return processDailyBriefing(job);
    case "sync-user":
      return processSyncUser(job);
    default:
      throw new Error(`[worker] no processor registered for job "${job.name}"`);
  }
}

async function main() {
  console.log("[worker] starting JARVIS background worker…");

  await registerScheduledJobs();
  console.log("[worker] scheduled jobs registered (heartbeat, daily-briefing)");

  const worker = new Worker(JARVIS_QUEUE_NAME, processor, {
    connection: getRedisConnection(),
    concurrency: 5,
  });

  worker.on("completed", (job) => {
    console.log(`[worker] completed "${job.name}" #${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[worker] FAILED "${job?.name ?? "unknown"}" #${job?.id ?? "?"} —`,
      err.message,
    );
  });

  const shutdown = async (signal: string) => {
    console.log(`[worker] received ${signal}, closing gracefully…`);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  console.log('[worker] listening on queue "jarvis" (concurrency 5)');
}

main().catch((err) => {
  console.error("[worker] fatal startup error:", err);
  process.exit(1);
});
