/**
 * RevenueCat network client — MOCK (Phase 11).
 * ---------------------------------------------------------------------------
 * The lowest layer, simulating the actual network round-trip to RevenueCat's
 * REST API. Nothing above this file should import it directly — everything
 * goes through `MockRevenueCatService` in mock-service.ts.
 *
 * RevenueCat's real API needs an app + products configured in their
 * dashboard before it returns anything meaningful, so this mock never
 * reaches a real network. It simulates latency and returns a response
 * shaped like RevenueCat's real `POST /v1/subscribers/:id/entitlements/
 * :entitlement_id/promotional` so real-service.ts can be a near drop-in
 * replacement later.
 */

function simulatedLatency(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type GrantPromotionalResult = {
  grantedAt: string;
  expiresAt: string;
};

/**
 * Simulates granting a promotional entitlement via RevenueCat's REST API.
 * Never reaches a real network — always "succeeds".
 */
export async function grantPromotional(
  days: number,
): Promise<GrantPromotionalResult> {
  await simulatedLatency(300);

  const grantedAt = new Date();
  const expiresAt = new Date(grantedAt.getTime() + days * 24 * 60 * 60 * 1000);

  return {
    grantedAt: grantedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
