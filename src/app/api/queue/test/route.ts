import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { enqueueJob } from "@/lib/queue";

export const dynamic = "force-dynamic";

/**
 * POST /api/queue/test
 *
 * ADMIN-only. Enqueues a one-off "heartbeat" job so an admin can manually
 * verify the worker process is picking up and completing jobs, without
 * waiting up to a minute for the next scheduled heartbeat.
 */
export async function POST() {
  try {
    await requireRole("ADMIN");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forbidden." },
      { status: 403 },
    );
  }

  const job = await enqueueJob("heartbeat", {});

  return NextResponse.json({
    enqueued: true,
    jobId: job.id,
    jobName: job.name,
  });
}
