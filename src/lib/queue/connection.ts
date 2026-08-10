/**
 * BullMQ Redis connection helper.
 * ---------------------------------------------------------------------------
 * BullMQ does NOT accept a Redis URL string directly — it needs a
 * `ConnectionOptions` object (host/port/password/etc). This parses
 * `REDIS_URL` (the same env var docker-compose and ioredis conventionally
 * use) into that shape.
 *
 * `maxRetriesPerRequest: null` is REQUIRED by BullMQ — without it, BullMQ's
 * blocking commands (used internally for job polling) will fail after the
 * default ioredis retry limit is hit, and BullMQ throws a warning telling you
 * to set this explicitly.
 *
 * Usage:
 *   import { getRedisConnection } from "@/lib/queue/connection";
 *   const queue = new Queue("jarvis", { connection: getRedisConnection() });
 */

import type { ConnectionOptions } from "bullmq";

let cached: ConnectionOptions | null = null;

/**
 * Parses `REDIS_URL` (e.g. "redis://:password@localhost:6379") into the
 * `{ host, port, password, maxRetriesPerRequest }` shape BullMQ expects.
 * Falls back to localhost:6379 (docker-compose default) if unset.
 */
export function getRedisConnection(): ConnectionOptions {
  if (cached) return cached;

  const raw = process.env.REDIS_URL ?? "redis://localhost:6379";

  let host = "localhost";
  let port = 6379;
  let password: string | undefined;

  try {
    const url = new URL(raw);
    host = url.hostname || host;
    port = url.port ? Number(url.port) : port;
    password = url.password || undefined;
  } catch {
    // Malformed REDIS_URL — fall back to the docker-compose defaults above
    // rather than crashing the whole process at import time.
  }

  cached = {
    host,
    port,
    password,
    // Required by BullMQ — see file header for why.
    maxRetriesPerRequest: null,
  };

  return cached;
}
