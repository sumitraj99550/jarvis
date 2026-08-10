/**
 * BullMQ Queue singleton.
 * ---------------------------------------------------------------------------
 * A single queue named "jarvis" backs every background job type in the
 * system. Job types are differentiated by the BullMQ job `name` field
 * (see jobs.ts), not by separate Queue instances — this keeps the
 * architecture simple and makes adding a new job type a one-line change.
 *
 * Stashed on globalThis so Next.js dev-mode hot reloads don't create a new
 * Queue (and a new ioredis connection) on every file save.
 *
 * Usage:
 *   import { getJobQueue } from "@/lib/queue/queues";
 *   await getJobQueue().add("heartbeat", {});
 */

import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue/connection";

export const JARVIS_QUEUE_NAME = "jarvis";

const globalForQueue = globalThis as unknown as {
  jarvisQueue: Queue | undefined;
};

/**
 * Returns the shared "jarvis" BullMQ Queue instance, creating it on first
 * call.
 */
export function getJobQueue(): Queue {
  if (globalForQueue.jarvisQueue) return globalForQueue.jarvisQueue;

  const queue = new Queue(JARVIS_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForQueue.jarvisQueue = queue;
  }

  return queue;
}
