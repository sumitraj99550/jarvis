/**
 * Daily briefing processor — runs at 8 AM UTC via the "daily-briefing"
 * repeatable job.
 *
 * Phase 14: generates a real briefing from real 24-hour deltas across
 * Tasks, Support, Meta Ads, Social, and Revenue, summarized by Gemini.
 * See src/lib/briefing/generate.ts for the actual aggregation + AI call —
 * this processor is just the scheduling glue.
 */

import type { Job } from "bullmq";
import { generateDailyBriefing } from "@/lib/briefing/generate";

export async function processDailyBriefing(
  job: Job,
): Promise<{ briefingId: string }> {
  const { id } = await generateDailyBriefing();

  console.log(`[worker] daily-briefing created — job #${job.id}`, id);

  return { briefingId: id };
}
