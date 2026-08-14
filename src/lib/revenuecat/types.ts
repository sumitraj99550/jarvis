/**
 * Local string-union types mirroring the Prisma Revenue* enums. Defined
 * locally (same pattern as `Role` in auth.ts) so this module compiles
 * before `prisma generate` has run.
 */

export type SubscriptionStatus =
  | "ACTIVE"
  | "IN_TRIAL"
  | "CANCELLED"
  | "EXPIRED"
  | "BILLING_ISSUE";

export type Store = "APP_STORE" | "PLAY_STORE" | "STRIPE" | "PROMOTIONAL";

export type TransactionType =
  | "PURCHASE"
  | "RENEWAL"
  | "REFUND"
  | "CANCELLATION"
  | "PROMOTIONAL_GRANT";

export type Period = "WEEKLY" | "MONTHLY" | "YEARLY" | "LIFETIME";

export const STORES: Store[] = [
  "APP_STORE",
  "PLAY_STORE",
  "STRIPE",
  "PROMOTIONAL",
];

export const STORE_LABELS: Record<Store, string> = {
  APP_STORE: "App Store",
  PLAY_STORE: "Play Store",
  STRIPE: "Stripe",
  PROMOTIONAL: "Promotional",
};

// ---------------------------------------------------------------------------
// DTOs exchanged between the UI, the service layer, and the provider
// ---------------------------------------------------------------------------

export type ProductDTO = {
  id: string;
  productId: string;
  name: string;
  priceCents: number;
  currency: string;
  period: Period;
  active: boolean;
};

export type SubscriberDTO = {
  id: string;
  appUserId: string;
  email: string | null;
  createdAt: string;
  activeSubscriptions: number;
  lifetimeValueCents: number;
};

export type SubscriptionDTO = {
  id: string;
  subscriberId: string;
  subscriberAppUserId: string;
  productId: string;
  productName: string;
  status: SubscriptionStatus;
  store: Store;
  startedAt: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
};

export type TransactionDTO = {
  id: string;
  subscriberId: string;
  subscriberAppUserId: string;
  productId: string;
  productName: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredAt: string;
};

export type RevenueOverview = {
  mrrCents: number;
  activeSubscribers: number;
  trialSubscribers: number;
  churnedThisMonth: number;
  totalRevenueCents: number;
  byStore: Record<Store, { subscribers: number; revenueCents: number }>;
};

export type RevenueSettingsDTO = {
  displayCurrency: string;
};

export type GrantEntitlementInput = {
  subscriberId: string;
  productId: string;
  days: number;
};

// ---------------------------------------------------------------------------
// Deterministic mock-data helpers
// ---------------------------------------------------------------------------

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const MOCK_PRODUCTS: Array<{
  productId: string;
  name: string;
  priceCents: number;
  period: Period;
}> = [
  {
    productId: "jarvis_pro_monthly",
    name: "JARVIS Pro (Monthly)",
    priceCents: 1999,
    period: "MONTHLY",
  },
  {
    productId: "jarvis_pro_yearly",
    name: "JARVIS Pro (Yearly)",
    priceCents: 19999,
    period: "YEARLY",
  },
  {
    productId: "jarvis_team_monthly",
    name: "JARVIS Team (Monthly)",
    priceCents: 4999,
    period: "MONTHLY",
  },
  {
    productId: "jarvis_lifetime",
    name: "JARVIS Lifetime",
    priceCents: 29999,
    period: "LIFETIME",
  },
];

export function getMockProductCatalog() {
  return MOCK_PRODUCTS;
}

const FIRST_NAMES = [
  "alex",
  "jordan",
  "sam",
  "riya",
  "wei",
  "lena",
  "omar",
  "priya",
  "noah",
  "maya",
];
const DOMAINS = ["gmail.com", "outlook.com", "proton.me", "icloud.com"];

/** Generates a believable-but-fake mock subscriber base for a given owner. */
export function generateMockSubscribers(
  ownerId: string,
  count: number,
): Array<{ appUserId: string; email: string | null; seedIndex: number }> {
  const out: Array<{
    appUserId: string;
    email: string | null;
    seedIndex: number;
  }> = [];
  for (let i = 0; i < count; i++) {
    const seed = hashSeed(`${ownerId}:subscriber:${i}`);
    const name = FIRST_NAMES[seed % FIRST_NAMES.length];
    const domain = DOMAINS[(seed >> 3) % DOMAINS.length];
    const hasEmail = seed % 5 !== 0; // ~80% have an email on file
    out.push({
      appUserId: `rc_${hashSeed(`${ownerId}:${i}`).toString(36)}`,
      email: hasEmail ? `${name}${i}@${domain}` : null,
      seedIndex: seed,
    });
  }
  return out;
}
