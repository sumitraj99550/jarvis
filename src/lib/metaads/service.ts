/**
 * MetaAdsService — the abstraction every caller (UI routes) depends on.
 * Same pattern as BufferService (Phase 10) and RevenueCatService (Phase 11):
 *
 *   UI / API routes
 *        │
 *        ▼
 *  MetaAdsService (this interface)
 *        │
 *   ┌────┴─────┐
 *   ▼          ▼
 * MockMetaAdsService   RealMetaAdsService
 * (now)                (later — drop-in)
 */

import type {
  AdsOverview,
  AdsSettingsDTO,
  AudienceDTO,
  CampaignDTO,
  CampaignStatus,
  CreateAudienceInput,
  CreateCampaignInput,
  DailyStatDTO,
} from "./types";

export interface MetaAdsService {
  getOverview(ownerId: string): Promise<AdsOverview>;

  listCampaigns(ownerId: string): Promise<CampaignDTO[]>;
  getCampaign(
    ownerId: string,
    id: string,
  ): Promise<{ campaign: CampaignDTO; dailyStats: DailyStatDTO[] } | null>;
  createCampaign(
    ownerId: string,
    input: CreateCampaignInput,
  ): Promise<CampaignDTO>;
  updateCampaignStatus(
    ownerId: string,
    id: string,
    status: CampaignStatus,
  ): Promise<CampaignDTO>;

  listAudiences(ownerId: string): Promise<AudienceDTO[]>;
  createAudience(
    ownerId: string,
    input: CreateAudienceInput,
  ): Promise<AudienceDTO>;

  getSettings(ownerId: string): Promise<AdsSettingsDTO>;
  updateSettings(
    ownerId: string,
    input: Partial<AdsSettingsDTO>,
  ): Promise<AdsSettingsDTO>;
}
