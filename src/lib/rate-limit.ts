/**
 * Rate limiting (Phase 19) — real, backed by the same Redis instance
 * BullMQ already uses (Phase 9), not an in-memory counter that resets on
 * every deploy/restart or doesn't work across multiple server instances.
 *
 * Fixed-window algorithm: `INCR` a per-window key, set it to expire after
 * the window, and reject once the count exceeds the limit. Simple, and
 * exactly correct for protecting against abuse/runaway costs on
 * AI-backed routes — doesn't need to be a sliding-window/token-bucket for
 * that purpose.
 */

import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  rateLimitRedis: Redis | undefined;
};

function getRedisClient(): Redis {
  if (globalForRedis.rateLimitRedis) return globalForRedis.rateLimitRedis;
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  if (process.env.NODE_ENV !== "production")
    globalForRedis.rateLimitRedis = client;
  return client;
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetsInSeconds: number;
};

/**
 * Checks and increments a rate-limit counter for `key` within `windowSeconds`.
 * Fails OPEN (allows the request) if Redis is unreachable — a rate limiter
 * being down should never take down the feature it's protecting.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const redis = getRedisClient();
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    const ttl = await redis.ttl(redisKey);
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetsInSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    // Redis unreachable — fail open rather than blocking legitimate
    // traffic because the rate limiter itself is down.
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetsInSeconds: windowSeconds,
    };
  }
}
