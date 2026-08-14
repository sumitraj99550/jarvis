/**
 * RealRevenueCatService — NOT YET IMPLEMENTED.
 * ---------------------------------------------------------------------------
 * Fill this in once RevenueCat is set up (app + products configured in
 * their dashboard, secret API key issued). Implements the exact same
 * `RevenueCatService` interface as `MockRevenueCatService`, so
 * `src/lib/revenuecat/index.ts` can switch every caller over with a
 * one-line change once this is filled in.
 *
 * Real RevenueCat API reference:
 *   GET  /v1/subscribers/:app_user_id                                → subscriber + entitlements
 *   POST /v1/subscribers/:app_user_id/entitlements/:id/promotional   → grant promotional access
 *   GET  /v1/subscribers/:app_user_id/transactions                   → transaction history
 *
 * Auth: Bearer secret key in the Authorization header, from
 * `process.env.REVENUECAT_API_KEY`.
 */

import type { RevenueCatService } from "./service";

const NOT_IMPLEMENTED =
  "RealRevenueCatService is not implemented yet. Set REVENUECAT_API_KEY " +
  "once your RevenueCat app + products are configured, then fill in the " +
  "methods in src/lib/revenuecat/real-service.ts against their REST API.";

export class RealRevenueCatService implements RevenueCatService {
  async getOverview(): ReturnType<RevenueCatService["getOverview"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async listProducts(): ReturnType<RevenueCatService["listProducts"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async listSubscribers(): ReturnType<RevenueCatService["listSubscribers"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getSubscriberDetail(): ReturnType<
    RevenueCatService["getSubscriberDetail"]
  > {
    throw new Error(NOT_IMPLEMENTED);
  }
  async listTransactions(): ReturnType<RevenueCatService["listTransactions"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async grantPromotionalEntitlement(): ReturnType<
    RevenueCatService["grantPromotionalEntitlement"]
  > {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getSettings(): ReturnType<RevenueCatService["getSettings"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async updateSettings(): ReturnType<RevenueCatService["updateSettings"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
