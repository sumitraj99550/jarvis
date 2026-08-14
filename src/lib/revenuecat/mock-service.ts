/**
 * MockRevenueCatService — full local implementation of `RevenueCatService`.
 * ---------------------------------------------------------------------------
 * Seeds a believable subscriber/subscription/transaction base per user on
 * first access, then every read (overview, lists, detail) is a real query
 * against that seeded data. The only mocked network hop is
 * `grantPromotional()` in client.ts.
 */

import { db } from "@/lib/db";
import { grantPromotional } from "./client";
import type { RevenueCatService } from "./service";
import {
  getMockProductCatalog,
  generateMockSubscribers,
  STORES,
  type GrantEntitlementInput,
  type Period,
  type ProductDTO,
  type RevenueOverview,
  type RevenueSettingsDTO,
  type Store,
  type SubscriberDTO,
  type SubscriptionDTO,
  type TransactionDTO,
  type TransactionType,
} from "./types";

const SUBSCRIBER_SEED_COUNT = 18;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Row → DTO mapping
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProductDTO(row: any): ProductDTO {
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    priceCents: row.priceCents,
    currency: row.currency,
    period: row.period,
    active: row.active,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSubscriptionDTO(row: any): SubscriptionDTO {
  return {
    id: row.id,
    subscriberId: row.subscriberId,
    subscriberAppUserId: row.subscriber?.appUserId ?? "",
    productId: row.productId,
    productName: row.product?.name ?? "",
    status: row.status,
    store: row.store,
    startedAt: new Date(row.startedAt).toISOString(),
    currentPeriodEnd: new Date(row.currentPeriodEnd).toISOString(),
    cancelledAt: row.cancelledAt
      ? new Date(row.cancelledAt).toISOString()
      : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransactionDTO(row: any): TransactionDTO {
  return {
    id: row.id,
    subscriberId: row.subscriberId,
    subscriberAppUserId: row.subscriber?.appUserId ?? "",
    productId: row.productId,
    productName: row.product?.name ?? "",
    type: row.type,
    amountCents: row.amountCents,
    currency: row.currency,
    occurredAt: new Date(row.occurredAt).toISOString(),
  };
}

class MockRevenueCatService implements RevenueCatService {
  // ---------------------------------------------------------------------
  // Seeding
  // ---------------------------------------------------------------------

  private async ensureProductsSeeded(): Promise<void> {
    const count = await db.revenueProduct.count();
    if (count > 0) return;

    for (const p of getMockProductCatalog()) {
      await db.revenueProduct.upsert({
        where: { productId: p.productId },
        update: {},
        create: {
          productId: p.productId,
          name: p.name,
          priceCents: p.priceCents,
          period: p.period as Period,
          currency: "USD",
        },
      });
    }
  }

  private async ensureSubscribersSeeded(ownerId: string): Promise<void> {
    const existing = await db.revenueSubscriber.count({ where: { ownerId } });
    if (existing > 0) return;

    const products = await db.revenueProduct.findMany();
    if (products.length === 0) return;

    const seeds = generateMockSubscribers(ownerId, SUBSCRIBER_SEED_COUNT);

    for (const seed of seeds) {
      const s = seed.seedIndex;
      const product = products[s % products.length]!;

      const subscriber = await db.revenueSubscriber.create({
        data: { ownerId, appUserId: seed.appUserId, email: seed.email },
      });

      // Status distribution: ~60% active, ~10% trial, ~15% cancelled, ~10%
      // expired, ~5% billing issue — deterministic from the seed.
      const bucket = s % 20;
      const status =
        bucket < 12
          ? "ACTIVE"
          : bucket < 14
            ? "IN_TRIAL"
            : bucket < 17
              ? "CANCELLED"
              : bucket < 19
                ? "EXPIRED"
                : "BILLING_ISSUE";

      const store: Store = STORES[s % STORES.length]!;
      const startedAt = new Date(Date.now() - ((s % 300) + 5) * DAY_MS);
      const currentPeriodEnd = new Date(
        Date.now() +
          (status === "ACTIVE" || status === "IN_TRIAL"
            ? ((s >> 2) % 28) + 1
            : -((s >> 2) % 20) - 1) *
            DAY_MS,
      );

      await db.revenueSubscription.create({
        data: {
          subscriberId: subscriber.id,
          productId: product.id,
          status,
          store,
          startedAt,
          currentPeriodEnd,
          cancelledAt:
            status === "CANCELLED"
              ? new Date(currentPeriodEnd.getTime() - 2 * DAY_MS)
              : null,
        },
      });

      // 1–3 historical transactions per subscriber
      const txnCount = 1 + (s % 3);
      for (let t = 0; t < txnCount; t++) {
        await db.revenueTransaction.create({
          data: {
            subscriberId: subscriber.id,
            productId: product.id,
            type: t === 0 ? "PURCHASE" : "RENEWAL",
            amountCents: product.priceCents,
            currency: product.currency,
            occurredAt: new Date(startedAt.getTime() + t * 30 * DAY_MS),
          },
        });
      }

      if (status === "CANCELLED") {
        await db.revenueTransaction.create({
          data: {
            subscriberId: subscriber.id,
            productId: product.id,
            type: "CANCELLATION",
            amountCents: 0,
            currency: product.currency,
            occurredAt: new Date(currentPeriodEnd.getTime() - 2 * DAY_MS),
          },
        });
      }
    }
  }

  private async ensureSeeded(ownerId: string): Promise<void> {
    await this.ensureProductsSeeded();
    await this.ensureSubscribersSeeded(ownerId);
  }

  // ---------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------

  async getOverview(ownerId: string): Promise<RevenueOverview> {
    await this.ensureSeeded(ownerId);

    const subscriptions = await db.revenueSubscription.findMany({
      where: { subscriber: { ownerId } },
      include: { product: true },
    });

    const byStore = Object.fromEntries(
      STORES.map((s) => [s, { subscribers: 0, revenueCents: 0 }]),
    ) as RevenueOverview["byStore"];

    let mrrCents = 0;
    let activeSubscribers = 0;
    let trialSubscribers = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const sub of subscriptions as any[]) {
      const monthlyEquivalent =
        sub.product.period === "YEARLY"
          ? Math.round(sub.product.priceCents / 12)
          : sub.product.period === "WEEKLY"
            ? sub.product.priceCents * 4
            : sub.product.period === "LIFETIME"
              ? 0
              : sub.product.priceCents;

      if (sub.status === "ACTIVE") {
        activeSubscribers += 1;
        mrrCents += monthlyEquivalent;
        byStore[sub.store as Store].subscribers += 1;
        byStore[sub.store as Store].revenueCents += monthlyEquivalent;
      }
      if (sub.status === "IN_TRIAL") trialSubscribers += 1;
    }

    const monthAgo = new Date(Date.now() - 30 * DAY_MS);
    const churnedThisMonth = await db.revenueSubscription.count({
      where: {
        subscriber: { ownerId },
        status: "CANCELLED",
        cancelledAt: { gte: monthAgo },
      },
    });

    const revenueAgg = await db.revenueTransaction.aggregate({
      where: {
        subscriber: { ownerId },
        type: { in: ["PURCHASE", "RENEWAL"] },
      },
      _sum: { amountCents: true },
    });

    return {
      mrrCents,
      activeSubscribers,
      trialSubscribers,
      churnedThisMonth,
      totalRevenueCents: revenueAgg._sum.amountCents ?? 0,
      byStore,
    };
  }

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------

  async listProducts(ownerId: string): Promise<ProductDTO[]> {
    await this.ensureSeeded(ownerId);
    const rows = await db.revenueProduct.findMany({
      orderBy: { priceCents: "asc" },
    });
    return rows.map(toProductDTO);
  }

  // ---------------------------------------------------------------------
  // Subscribers
  // ---------------------------------------------------------------------

  async listSubscribers(
    ownerId: string,
    opts?: { search?: string },
  ): Promise<SubscriberDTO[]> {
    await this.ensureSeeded(ownerId);

    const rows = await db.revenueSubscriber.findMany({
      where: {
        ownerId,
        ...(opts?.search
          ? {
              OR: [
                { appUserId: { contains: opts.search, mode: "insensitive" } },
                { email: { contains: opts.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        subscriptions: true,
        transactions: { where: { type: { in: ["PURCHASE", "RENEWAL"] } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[]).map((row) => ({
      id: row.id,
      appUserId: row.appUserId,
      email: row.email,
      createdAt: new Date(row.createdAt).toISOString(),
      activeSubscriptions: row.subscriptions.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => s.status === "ACTIVE" || s.status === "IN_TRIAL",
      ).length,
      lifetimeValueCents: row.transactions.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sum: number, t: any) => sum + t.amountCents,
        0,
      ),
    }));
  }

  async getSubscriberDetail(
    ownerId: string,
    subscriberId: string,
  ): Promise<{
    subscriber: SubscriberDTO;
    subscriptions: SubscriptionDTO[];
    transactions: TransactionDTO[];
  } | null> {
    const row = await db.revenueSubscriber.findFirst({
      where: { id: subscriberId, ownerId },
      include: {
        subscriptions: { include: { subscriber: true, product: true } },
        transactions: {
          include: { subscriber: true, product: true },
          orderBy: { occurredAt: "desc" },
        },
      },
    });
    if (!row) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;

    return {
      subscriber: {
        id: r.id,
        appUserId: r.appUserId,
        email: r.email,
        createdAt: new Date(r.createdAt).toISOString(),
        activeSubscriptions: r.subscriptions.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.status === "ACTIVE" || s.status === "IN_TRIAL",
        ).length,
        lifetimeValueCents: r.transactions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((t: any) => t.type === "PURCHASE" || t.type === "RENEWAL")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .reduce((sum: number, t: any) => sum + t.amountCents, 0),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subscriptions: r.subscriptions.map((s: any) => toSubscriptionDTO(s)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transactions: r.transactions.map((t: any) => toTransactionDTO(t)),
    };
  }

  // ---------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------

  async listTransactions(
    ownerId: string,
    opts?: { type?: TransactionType },
  ): Promise<TransactionDTO[]> {
    await this.ensureSeeded(ownerId);

    const rows = await db.revenueTransaction.findMany({
      where: {
        subscriber: { ownerId },
        ...(opts?.type ? { type: opts.type } : {}),
      },
      include: { subscriber: true, product: true },
      orderBy: { occurredAt: "desc" },
      take: 100,
    });

    return rows.map(toTransactionDTO);
  }

  // ---------------------------------------------------------------------
  // Promotional entitlement grant — the one real "write" action
  // ---------------------------------------------------------------------

  async grantPromotionalEntitlement(
    ownerId: string,
    input: GrantEntitlementInput,
  ): Promise<SubscriptionDTO> {
    const subscriber = await db.revenueSubscriber.findFirst({
      where: { id: input.subscriberId, ownerId },
    });
    if (!subscriber) throw new Error("Subscriber not found.");

    const product = await db.revenueProduct.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new Error("Product not found.");

    const grant = await grantPromotional(input.days);

    const subscription = await db.revenueSubscription.create({
      data: {
        subscriberId: subscriber.id,
        productId: product.id,
        status: "ACTIVE",
        store: "PROMOTIONAL",
        startedAt: new Date(grant.grantedAt),
        currentPeriodEnd: new Date(grant.expiresAt),
      },
      include: { subscriber: true, product: true },
    });

    await db.revenueTransaction.create({
      data: {
        subscriberId: subscriber.id,
        productId: product.id,
        type: "PROMOTIONAL_GRANT",
        amountCents: 0,
        currency: product.currency,
        occurredAt: new Date(grant.grantedAt),
      },
    });

    return toSubscriptionDTO(subscription);
  }

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------

  async getSettings(ownerId: string): Promise<RevenueSettingsDTO> {
    const row = await db.revenueSettings.upsert({
      where: { userId: ownerId },
      update: {},
      create: { userId: ownerId },
    });
    return { displayCurrency: row.displayCurrency };
  }

  async updateSettings(
    ownerId: string,
    input: Partial<RevenueSettingsDTO>,
  ): Promise<RevenueSettingsDTO> {
    const row = await db.revenueSettings.upsert({
      where: { userId: ownerId },
      update: { ...input },
      create: {
        userId: ownerId,
        displayCurrency: input.displayCurrency ?? "USD",
      },
    });
    return { displayCurrency: row.displayCurrency };
  }
}

export const mockRevenueCatService = new MockRevenueCatService();
