/**
 * Buffer network client — MOCK (Phase 10).
 * ---------------------------------------------------------------------------
 * This is the lowest layer: it simulates the actual network round-trip to
 * Buffer's API. Nothing above this file (the service layer, routes, UI,
 * Hermes tool) should import this directly — everything goes through
 * `MockBufferService` in mock-service.ts, which is what implements the
 * `BufferService` interface real callers depend on.
 *
 * Buffer's real API requires a paid plan to issue an access token — there
 * is no free tier with API access — so this mock never reaches a real
 * network. It simulates latency and returns a response shaped exactly like
 * Buffer's real `POST /1/updates/create.json` so that `real-service.ts` can
 * be implemented later as a near drop-in replacement of this file.
 */

import type { SocialPlatform } from "./types";

export type CreateUpdateInput = {
  platform: SocialPlatform;
  content: string;
  /** ISO timestamp — omit to publish immediately */
  scheduledFor?: string;
};

export type CreateUpdateResult = {
  providerId: string;
  status: "scheduled" | "published";
  scheduledFor: string | null;
  publishedAt: string | null;
};

function simulatedLatency(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulates `POST /1/updates/create.json`. Never reaches a real network —
 * always "succeeds" (this mock has no concept of connected/disconnected;
 * that check happens one layer up, in MockBufferService, against the
 * SocialAccount table).
 */
export async function createUpdate(
  input: CreateUpdateInput,
): Promise<CreateUpdateResult> {
  await simulatedLatency(300);

  const providerId = `stub_upd_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  if (input.scheduledFor) {
    return {
      providerId,
      status: "scheduled",
      scheduledFor: input.scheduledFor,
      publishedAt: null,
    };
  }

  return {
    providerId,
    status: "published",
    scheduledFor: null,
    publishedAt: new Date().toISOString(),
  };
}
