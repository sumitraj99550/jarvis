/**
 * Daily briefing processor — runs at 8 AM UTC via the "daily-briefing"
 * repeatable job.
 *
 * STUB for Phase 9: creates a placeholder Briefing row so the pipeline
 * (scheduler → worker → DB) is proven end-to-end. Phase 14 (Daily Briefing
 * Engine) replaces the summary text with a real Gemini-generated digest of
 * the previous day's tasks, tickets, and campaigns.
 */

import type { Job } from "bullmq";
import { db } from "@/lib/db";

export async function processDailyBriefing(
  job: Job,
): Promise<{ briefingId: string }> {
  const summary =
    "Daily briefing pipeline is online. Real AI-generated summaries " +
    "arrive in Phase 14 (Daily Briefing Engine).";

  const briefing = await db.briefing.create({
    data: { summary },
  });

  console.log(`[worker] daily-briefing created — job #${job.id}`, briefing.id);

  return { briefingId: briefing.id as string };
}
