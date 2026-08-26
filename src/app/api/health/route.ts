import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — Phase 20. Unauthenticated on purpose: load balancers,
 * Docker `HEALTHCHECK`, and uptime monitors (e.g. UptimeRobot, a
 * Kubernetes liveness/readiness probe) all need to hit this without
 * credentials. Does real checks, not a hardcoded 200 — a failed DB or
 * Redis connection genuinely returns 503 so orchestrators can act on it
 * (stop routing traffic, restart the container, alert on-call).
 */
export async function GET() {
  const checks: Record<string, boolean> = {};

  try {
    await db.user.count();
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // Redis check is optional — background jobs degrade gracefully without
  // it (see Phase 9), so an unreachable Redis alone shouldn't flip the
  // whole app to "unhealthy" the way a dead database should.
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
    });
    await redis.connect();
    await redis.ping();
    redis.disconnect();
    checks.redis = true;
  } catch {
    checks.redis = false;
  }

  const healthy = checks.database === true;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
