/**
 * Service selector — the ONLY place that decides mock vs. real.
 * ---------------------------------------------------------------------------
 * Every caller (API routes, the Hermes tool) imports `getBufferService()`
 * from here and never touches MockBufferService / RealBufferService
 * directly. Once RealBufferService is implemented and BUFFER_ACCESS_TOKEN
 * is set, this function starts returning the real one — no other file in
 * the app needs to change.
 */

import { mockBufferService } from "./mock-service";
import { RealBufferService } from "./real-service";
import type { BufferService } from "./service";

let realService: RealBufferService | null = null;

export function getBufferService(): BufferService {
  if (process.env.BUFFER_ACCESS_TOKEN) {
    if (!realService) realService = new RealBufferService();
    return realService;
  }
  return mockBufferService;
}

export type { BufferService } from "./service";
export * from "./types";
