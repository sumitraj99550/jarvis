/**
 * Service selector — the ONLY place that decides mock vs. real.
 * ---------------------------------------------------------------------------
 * Every caller (API routes) imports `getRevenueCatService()` from here and
 * never touches MockRevenueCatService / RealRevenueCatService directly.
 * Once RealRevenueCatService is implemented and REVENUECAT_API_KEY is set,
 * this starts returning the real one — no other file needs to change.
 */

import { mockRevenueCatService } from "./mock-service";
import { RealRevenueCatService } from "./real-service";
import type { RevenueCatService } from "./service";

let realService: RealRevenueCatService | null = null;

export function getRevenueCatService(): RevenueCatService {
  if (process.env.REVENUECAT_API_KEY) {
    if (!realService) realService = new RealRevenueCatService();
    return realService;
  }
  return mockRevenueCatService;
}

export type { RevenueCatService } from "./service";
export * from "./types";
