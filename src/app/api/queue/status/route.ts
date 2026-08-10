import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getJobQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

/**
 * GET /api/queue/status
 *
 * Auth-protected (any signed-in user). Reports BullMQ queue health: job
 * counts by state, plus the most recent heartbeat completion so the
 * dashboard can distinguish "worker never ran" from "worker is alive".
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  try {
    const queue = getJobQueue();

    const [counts, recentCompleted] = await Promise.all([
      queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
      queue.getJobs(["completed"], 0, 20),
    ]);

    const lastHeartbeat = recentCompleted
      .filter((job) => job.name === "heartbeat")
      .sort((a, b) => (b.finishedOn ?? 0) - (a.finishedOn ?? 0))[0];

    return NextResponse.json({
      operational: true,
      counts,
      lastHeartbeatAt: lastHeartbeat?.finishedOn
        ? new Date(lastHeartbeat.finishedOn).toISOString()
        : null,
    });
  } catch (err) {
    // Redis unreachable, or the worker/queue infra isn't up yet.
    return NextResponse.json(
      {
        operational: false,
        error:
          err instanceof Error ? err.message : "Failed to reach the queue.",
      },
      { status: 503 },
    );
  }
}
