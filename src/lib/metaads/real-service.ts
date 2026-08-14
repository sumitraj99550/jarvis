/**
 * RealMetaAdsService — NOT YET IMPLEMENTED.
 * ---------------------------------------------------------------------------
 * Fill this in once a Meta Business Manager account, ad account, and the
 * necessary app review/permissions are in place. Implements the exact same
 * `MetaAdsService` interface as `MockMetaAdsService`, so
 * `src/lib/metaads/index.ts` can switch every caller over with a one-line
 * change once this is filled in.
 *
 * Real Meta Marketing API reference:
 *   POST /v20.0/act_{ad_account_id}/campaigns        → create a campaign
 *   POST /v20.0/{campaign_id}                        → update status/budget
 *   GET  /v20.0/{campaign_id}/insights                → daily performance stats
 *   POST /v20.0/act_{ad_account_id}/customaudiences   → create an audience
 *
 * Auth: Bearer access token in the Authorization header, from
 * `process.env.META_ADS_ACCESS_TOKEN`.
 */

import type { MetaAdsService } from "./service";

const NOT_IMPLEMENTED =
  "RealMetaAdsService is not implemented yet. Set META_ADS_ACCESS_TOKEN " +
  "once your Meta Business Manager + ad account are configured, then fill " +
  "in the methods in src/lib/metaads/real-service.ts against the Marketing API.";

export class RealMetaAdsService implements MetaAdsService {
  async getOverview(): ReturnType<MetaAdsService["getOverview"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async listCampaigns(): ReturnType<MetaAdsService["listCampaigns"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getCampaign(): ReturnType<MetaAdsService["getCampaign"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async createCampaign(): ReturnType<MetaAdsService["createCampaign"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async updateCampaignStatus(): ReturnType<
    MetaAdsService["updateCampaignStatus"]
  > {
    throw new Error(NOT_IMPLEMENTED);
  }
  async listAudiences(): ReturnType<MetaAdsService["listAudiences"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async createAudience(): ReturnType<MetaAdsService["createAudience"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getSettings(): ReturnType<MetaAdsService["getSettings"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async updateSettings(): ReturnType<MetaAdsService["updateSettings"]> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
