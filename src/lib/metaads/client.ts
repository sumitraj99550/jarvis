/**
 * Meta Marketing API client — MOCK (Phase 12).
 * ---------------------------------------------------------------------------
 * The lowest layer, simulating the actual network round-trip to Meta's
 * Marketing API. Nothing above this file should import it directly —
 * everything goes through `MockMetaAdsService` in mock-service.ts.
 *
 * Meta's real Marketing API needs a Business Manager account, an ad
 * account, and app review for several permissions before it's usable, so
 * this mock never reaches a real network. It simulates latency and returns
 * responses shaped like Meta's real endpoints so real-service.ts can be a
 * near drop-in replacement later.
 *
 * Real Meta Marketing API reference:
 *   POST /v20.0/act_{ad_account_id}/campaigns        → create a campaign
 *   POST /v20.0/{campaign_id}                        → update status/budget
 *   POST /v20.0/act_{ad_account_id}/customaudiences   → create an audience
 */

function simulatedLatency(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockProviderId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function createCampaign(): Promise<{ providerId: string }> {
  await simulatedLatency(300);
  return { providerId: mockProviderId("mock_camp") };
}

export async function updateCampaignStatus(): Promise<{ ok: true }> {
  await simulatedLatency(200);
  return { ok: true };
}

export async function createAudience(): Promise<{ providerId: string }> {
  await simulatedLatency(300);
  return { providerId: mockProviderId("mock_aud") };
}
