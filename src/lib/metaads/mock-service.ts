/**
 * MockMetaAdsService — full local implementation of `MetaAdsService`.
 * ---------------------------------------------------------------------------
 * Seeds a believable campaign base (with 30 days of daily stats) per user on
 * first access, then every read is a real query against that seeded data.
 * Creating a campaign, changing its status, and creating an audience are all
 * real DB writes — only the network hop to Meta is mocked (client.ts).
 */

import { db } from "@/lib/db";
import {
  createAudience as mockCreateAudience,
  createCampaign as mockCreateCampaign,
  updateCampaignStatus as mockUpdateStatus,
} from "./client";
import type { MetaAdsService } from "./service";
import {
  generateMockAudienceSize,
  generateMockDailyStat,
  getMockCampaignSeeds,
  PLATFORMS,
  type AdPlatform,
  type AdsOverview,
  type AdsSettingsDTO,
  type AudienceDTO,
  type CampaignDTO,
  type CampaignStatus,
  type CreateAudienceInput,
  type CreateCampaignInput,
  type DailyStatDTO,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const STAT_HISTORY_DAYS = 30;

// ---------------------------------------------------------------------------
// Row → DTO mapping
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCampaignDTO(row: any): CampaignDTO {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    objective: row.objective,
    platform: row.platform,
    budgetCents: row.budgetCents,
    dailyBudgetCents: row.dailyBudgetCents,
    spendCents: Math.round(Number(row.spend) * 100),
    impressions: row.impressions,
    clicks: row.clicks,
    providerId: row.providerId ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAudienceDTO(row: any): AudienceDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    sizeEstimate: row.sizeEstimate,
    providerId: row.providerId ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

class MockMetaAdsService implements MetaAdsService {
  // ---------------------------------------------------------------------
  // Seeding
  // ---------------------------------------------------------------------

  private async ensureCampaignsSeeded(ownerId: string): Promise<void> {
    const existing = await db.campaign.count({ where: { ownerId } });
    if (existing > 0) return;

    const seeds = getMockCampaignSeeds(ownerId);

    for (const seed of seeds) {
      const campaign = await db.campaign.create({
        data: {
          ownerId,
          name: seed.name,
          objective: seed.objective,
          platform: seed.platform,
          status: seed.status,
          budgetCents: seed.budgetCents,
          dailyBudgetCents: seed.dailyBudgetCents,
          providerId: `mock_camp_seed_${seed.seed.toString(36)}`,
        },
      });

      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpendCents = 0;

      const activeDays = campaign.status === "DRAFT" ? 0 : STAT_HISTORY_DAYS;

      for (let d = 0; d < activeDays; d++) {
        const date = new Date(Date.now() - (STAT_HISTORY_DAYS - d) * DAY_MS);
        const stat = generateMockDailyStat(`${campaign.id}:${d}`);

        await db.campaignDailyStat.create({
          data: {
            campaignId: campaign.id,
            date,
            impressions: stat.impressions,
            clicks: stat.clicks,
            spendCents: stat.spendCents,
          },
        });

        totalImpressions += stat.impressions;
        totalClicks += stat.clicks;
        totalSpendCents += stat.spendCents;
      }

      await db.campaign.update({
        where: { id: campaign.id },
        data: {
          impressions: totalImpressions,
          clicks: totalClicks,
          spend: totalSpendCents / 100,
        },
      });
    }
  }

  private async ensureAudiencesSeeded(ownerId: string): Promise<void> {
    const existing = await db.adAudience.count({ where: { ownerId } });
    if (existing > 0) return;

    const templates = [
      {
        name: "Website Visitors (30d)",
        description: "Anyone who visited in the last 30 days",
      },
      {
        name: "Cart Abandoners",
        description: "Added to cart but didn't purchase",
      },
      {
        name: "Lookalike — Top Customers (1%)",
        description: "Modeled on your highest-LTV customers",
      },
    ];

    for (const [i, t] of templates.entries()) {
      await db.adAudience.create({
        data: {
          ownerId,
          name: t.name,
          description: t.description,
          sizeEstimate: generateMockAudienceSize(`${ownerId}:audience:${i}`),
          providerId: `mock_aud_seed_${i}`,
        },
      });
    }
  }

  private async ensureSeeded(ownerId: string): Promise<void> {
    await this.ensureCampaignsSeeded(ownerId);
    await this.ensureAudiencesSeeded(ownerId);
  }

  // ---------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------

  async getOverview(ownerId: string): Promise<AdsOverview> {
    await this.ensureSeeded(ownerId);

    const campaigns = await db.campaign.findMany({ where: { ownerId } });

    const byPlatform = Object.fromEntries(
      PLATFORMS.map((p) => [p, { campaigns: 0, spendCents: 0, clicks: 0 }]),
    ) as AdsOverview["byPlatform"];

    let totalSpendCents = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let activeCampaigns = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of campaigns as any[]) {
      const spendCents = Math.round(Number(c.spend) * 100);
      totalSpendCents += spendCents;
      totalImpressions += c.impressions;
      totalClicks += c.clicks;
      if (c.status === "ACTIVE") activeCampaigns += 1;

      const bucket = byPlatform[c.platform as AdPlatform];
      bucket.campaigns += 1;
      bucket.spendCents += spendCents;
      bucket.clicks += c.clicks;
    }

    return {
      totalSpendCents,
      totalImpressions,
      totalClicks,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      activeCampaigns,
      byPlatform,
    };
  }

  // ---------------------------------------------------------------------
  // Campaigns
  // ---------------------------------------------------------------------

  async listCampaigns(ownerId: string): Promise<CampaignDTO[]> {
    await this.ensureSeeded(ownerId);
    const rows = await db.campaign.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toCampaignDTO);
  }

  async getCampaign(
    ownerId: string,
    id: string,
  ): Promise<{ campaign: CampaignDTO; dailyStats: DailyStatDTO[] } | null> {
    const row = await db.campaign.findFirst({ where: { id, ownerId } });
    if (!row) return null;

    const stats = await db.campaignDailyStat.findMany({
      where: { campaignId: id },
      orderBy: { date: "asc" },
    });

    return {
      campaign: toCampaignDTO(row),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dailyStats: (stats as any[]).map((s) => ({
        date: new Date(s.date).toISOString(),
        impressions: s.impressions,
        clicks: s.clicks,
        spendCents: s.spendCents,
      })),
    };
  }

  async createCampaign(
    ownerId: string,
    input: CreateCampaignInput,
  ): Promise<CampaignDTO> {
    const { providerId } = await mockCreateCampaign();

    const row = await db.campaign.create({
      data: {
        ownerId,
        name: input.name,
        objective: input.objective,
        platform: input.platform,
        budgetCents: input.budgetCents,
        dailyBudgetCents: input.dailyBudgetCents,
        status: "ACTIVE",
        providerId,
      },
    });

    return toCampaignDTO(row);
  }

  async updateCampaignStatus(
    ownerId: string,
    id: string,
    status: CampaignStatus,
  ): Promise<CampaignDTO> {
    const existing = await db.campaign.findFirst({ where: { id, ownerId } });
    if (!existing) throw new Error("Campaign not found.");

    await mockUpdateStatus();

    const row = await db.campaign.update({
      where: { id },
      data: { status },
    });

    return toCampaignDTO(row);
  }

  // ---------------------------------------------------------------------
  // Audiences
  // ---------------------------------------------------------------------

  async listAudiences(ownerId: string): Promise<AudienceDTO[]> {
    await this.ensureSeeded(ownerId);
    const rows = await db.adAudience.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toAudienceDTO);
  }

  async createAudience(
    ownerId: string,
    input: CreateAudienceInput,
  ): Promise<AudienceDTO> {
    const { providerId } = await mockCreateAudience();

    const row = await db.adAudience.create({
      data: {
        ownerId,
        name: input.name,
        description: input.description ?? null,
        sizeEstimate: generateMockAudienceSize(
          `${ownerId}:${input.name}:${Date.now()}`,
        ),
        providerId,
      },
    });

    return toAudienceDTO(row);
  }

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------

  async getSettings(ownerId: string): Promise<AdsSettingsDTO> {
    const row = await db.metaAdsSettings.upsert({
      where: { userId: ownerId },
      update: {},
      create: { userId: ownerId },
    });
    return {
      displayCurrency: row.displayCurrency,
      autoPauseOnBudget: row.autoPauseOnBudget,
    };
  }

  async updateSettings(
    ownerId: string,
    input: Partial<AdsSettingsDTO>,
  ): Promise<AdsSettingsDTO> {
    const row = await db.metaAdsSettings.upsert({
      where: { userId: ownerId },
      update: { ...input },
      create: {
        userId: ownerId,
        displayCurrency: input.displayCurrency ?? "USD",
        autoPauseOnBudget: input.autoPauseOnBudget ?? true,
      },
    });
    return {
      displayCurrency: row.displayCurrency,
      autoPauseOnBudget: row.autoPauseOnBudget,
    };
  }
}

export const mockMetaAdsService = new MockMetaAdsService();
