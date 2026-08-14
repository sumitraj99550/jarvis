/**
 * Local string-union types mirroring the Prisma Meta Ads enums. Defined
 * locally so this module compiles before `prisma generate` has run.
 */

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";

export type CampaignObjective =
  | "AWARENESS"
  | "TRAFFIC"
  | "ENGAGEMENT"
  | "CONVERSIONS"
  | "APP_INSTALLS";

export type AdPlatform =
  | "FACEBOOK"
  | "INSTAGRAM"
  | "AUDIENCE_NETWORK"
  | "MESSENGER";

export const PLATFORMS: AdPlatform[] = [
  "FACEBOOK",
  "INSTAGRAM",
  "AUDIENCE_NETWORK",
  "MESSENGER",
];

export const PLATFORM_LABELS: Record<AdPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  AUDIENCE_NETWORK: "Audience Network",
  MESSENGER: "Messenger",
};

export const OBJECTIVES: CampaignObjective[] = [
  "AWARENESS",
  "TRAFFIC",
  "ENGAGEMENT",
  "CONVERSIONS",
  "APP_INSTALLS",
];

export const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  AWARENESS: "Awareness",
  TRAFFIC: "Traffic",
  ENGAGEMENT: "Engagement",
  CONVERSIONS: "Conversions",
  APP_INSTALLS: "App Installs",
};

// ---------------------------------------------------------------------------
// DTOs exchanged between the UI, the service layer, and the provider
// ---------------------------------------------------------------------------

export type CampaignDTO = {
  id: string;
  name: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  platform: AdPlatform;
  budgetCents: number;
  dailyBudgetCents: number;
  spendCents: number;
  impressions: number;
  clicks: number;
  providerId: string | null;
  createdAt: string;
};

export type DailyStatDTO = {
  date: string;
  impressions: number;
  clicks: number;
  spendCents: number;
};

export type AudienceDTO = {
  id: string;
  name: string;
  description: string | null;
  sizeEstimate: number;
  providerId: string | null;
  createdAt: string;
};

export type AdsOverview = {
  totalSpendCents: number;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  activeCampaigns: number;
  byPlatform: Record<
    AdPlatform,
    { campaigns: number; spendCents: number; clicks: number }
  >;
};

export type CreateCampaignInput = {
  name: string;
  objective: CampaignObjective;
  platform: AdPlatform;
  budgetCents: number;
  dailyBudgetCents: number;
};

export type CreateAudienceInput = {
  name: string;
  description?: string;
};

export type AdsSettingsDTO = {
  displayCurrency: string;
  autoPauseOnBudget: boolean;
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

/** Generates a believable-but-fake daily performance point. */
export function generateMockDailyStat(seed: string): {
  impressions: number;
  clicks: number;
  spendCents: number;
} {
  const hash = hashSeed(seed);
  const impressions = 500 + (hash % 9500);
  const ctr = 0.005 + ((hash >> 4) % 30) / 1000; // 0.5%–3.5%
  const clicks = Math.round(impressions * ctr);
  const cpcCents = 15 + ((hash >> 8) % 60); // $0.15–$0.75 CPC
  const spendCents = clicks * cpcCents;
  return { impressions, clicks, spendCents };
}

/** Deterministic mock audience size. */
export function generateMockAudienceSize(seed: string): number {
  const hash = hashSeed(seed);
  return 5_000 + (hash % 495_000);
}

const CAMPAIGN_NAME_TEMPLATES = [
  "Spring Launch",
  "Retargeting — Cart Abandoners",
  "Lookalike Prospecting",
  "Brand Awareness Push",
  "App Install Drive",
  "Holiday Promo",
];

export function getMockCampaignSeeds(ownerId: string) {
  return CAMPAIGN_NAME_TEMPLATES.map((name, i) => {
    const hash = hashSeed(`${ownerId}:campaign:${i}`);
    return {
      name,
      objective: OBJECTIVES[hash % OBJECTIVES.length]!,
      platform: PLATFORMS[(hash >> 2) % PLATFORMS.length]!,
      budgetCents: (5 + (hash % 20)) * 10000, // $500–$2500
      dailyBudgetCents: (2 + (hash % 8)) * 1000, // $20–$100
      status: (["ACTIVE", "ACTIVE", "PAUSED", "COMPLETED"] as CampaignStatus[])[
        hash % 4
      ]!,
      seed: hash,
    };
  });
}
