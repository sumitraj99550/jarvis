/**
 * Service selector — the ONLY place that decides mock vs. real.
 * ---------------------------------------------------------------------------
 * Every caller (API routes) imports `getMetaAdsService()` from here and
 * never touches MockMetaAdsService / RealMetaAdsService directly. Once
 * RealMetaAdsService is implemented and META_ADS_ACCESS_TOKEN is set, this
 * starts returning the real one — no other file needs to change.
 */

import { mockMetaAdsService } from "./mock-service";
import { RealMetaAdsService } from "./real-service";
import type { MetaAdsService } from "./service";

let realService: RealMetaAdsService | null = null;

export function getMetaAdsService(): MetaAdsService {
  if (process.env.META_ADS_ACCESS_TOKEN) {
    if (!realService) realService = new RealMetaAdsService();
    return realService;
  }
  return mockMetaAdsService;
}

export type { MetaAdsService } from "./service";
export * from "./types";
