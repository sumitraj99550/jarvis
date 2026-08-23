/**
 * Real AI usage tracking (Phase 19).
 * ---------------------------------------------------------------------------
 * Reads `usageMetadata` directly off actual Gemini API responses — not
 * estimated, not simulated. Logging is fire-and-forget: a failure here
 * must never break the AI call it's tracking, so every call site wraps
 * this in a best-effort try/catch internally.
 */

import { db } from "@/lib/db";
import { estimateCostMicros } from "./pricing";

export type UsageMetadataLike = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

export async function logAiUsage(input: {
  feature: string;
  model: string;
  usage: UsageMetadataLike | undefined;
  userId?: string;
}): Promise<void> {
  if (!input.usage) return;

  const promptTokens = input.usage.promptTokenCount ?? 0;
  const completionTokens = input.usage.candidatesTokenCount ?? 0;
  const totalTokens =
    input.usage.totalTokenCount ?? promptTokens + completionTokens;

  try {
    await db.aiUsageLog.create({
      data: {
        feature: input.feature,
        model: input.model,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostMicros: estimateCostMicros(
          input.model,
          promptTokens,
          completionTokens,
        ),
        userId: input.userId,
      },
    });
  } catch {
    // Never let usage logging break the actual AI call it's tracking.
  }
}
