/**
 * RevenueCatService — the abstraction every caller (UI routes) depends on.
 * Same pattern as BufferService (Phase 10):
 *
 *   UI / API routes
 *        │
 *        ▼
 *  RevenueCatService (this interface)
 *        │
 *   ┌────┴─────┐
 *   ▼          ▼
 * MockRevenueCatService   RealRevenueCatService
 * (now)                   (later — drop-in)
 */

import type {
  GrantEntitlementInput,
  ProductDTO,
  RevenueOverview,
  RevenueSettingsDTO,
  SubscriberDTO,
  SubscriptionDTO,
  TransactionDTO,
} from "./types";

export interface RevenueCatService {
  getOverview(ownerId: string): Promise<RevenueOverview>;

  listProducts(ownerId: string): Promise<ProductDTO[]>;

  listSubscribers(
    ownerId: string,
    opts?: { search?: string },
  ): Promise<SubscriberDTO[]>;
  getSubscriberDetail(
    ownerId: string,
    subscriberId: string,
  ): Promise<{
    subscriber: SubscriberDTO;
    subscriptions: SubscriptionDTO[];
    transactions: TransactionDTO[];
  } | null>;

  listTransactions(
    ownerId: string,
    opts?: { type?: TransactionDTO["type"] },
  ): Promise<TransactionDTO[]>;

  /** Grants a promotional entitlement — the one real "write" action in this phase. */
  grantPromotionalEntitlement(
    ownerId: string,
    input: GrantEntitlementInput,
  ): Promise<SubscriptionDTO>;

  getSettings(ownerId: string): Promise<RevenueSettingsDTO>;
  updateSettings(
    ownerId: string,
    input: Partial<RevenueSettingsDTO>,
  ): Promise<RevenueSettingsDTO>;
}
