/**
 * BufferService — the abstraction every caller (UI routes, the Hermes tool)
 * depends on. Nothing outside src/lib/buffer/ ever talks to Prisma or a
 * provider directly for social data — everything goes through this
 * interface.
 *
 *   UI / API routes / Hermes tool
 *              │
 *              ▼
 *      BufferService (this interface)
 *              │
 *      ┌───────┴────────┐
 *      ▼                ▼
 * MockBufferService   RealBufferService
 * (now — mock-service.ts)  (later — real-service.ts)
 *
 * Swapping providers later means implementing RealBufferService and
 * flipping the selector in index.ts — no changes to routes, tools, or UI.
 */

import type {
  CreatePostInput,
  SocialAccountDTO,
  SocialAnalyticsSummary,
  SocialPlatform,
  SocialPostDTO,
  SocialPostStatus,
  SocialSettingsDTO,
  UpdatePostInput,
} from "./types";

export interface BufferService {
  // Connected accounts ------------------------------------------------------
  listAccounts(userId: string): Promise<SocialAccountDTO[]>;
  connectAccount(
    userId: string,
    platform: SocialPlatform,
    handle: string,
  ): Promise<SocialAccountDTO>;
  disconnectAccount(userId: string, platform: SocialPlatform): Promise<void>;

  // Posts ---------------------------------------------------------------
  listPosts(
    userId: string,
    filter?: { status?: SocialPostStatus },
  ): Promise<SocialPostDTO[]>;
  getPost(userId: string, id: string): Promise<SocialPostDTO | null>;
  createPost(userId: string, input: CreatePostInput): Promise<SocialPostDTO>;
  updatePost(
    userId: string,
    id: string,
    input: UpdatePostInput,
  ): Promise<SocialPostDTO>;
  /** Publishes a draft or scheduled post immediately. */
  publishPost(userId: string, id: string): Promise<SocialPostDTO>;
  deletePost(userId: string, id: string): Promise<void>;

  // Analytics -----------------------------------------------------------
  getAnalytics(userId: string): Promise<SocialAnalyticsSummary>;

  // Settings --------------------------------------------------------------
  getSettings(userId: string): Promise<SocialSettingsDTO>;
  updateSettings(
    userId: string,
    input: Partial<SocialSettingsDTO>,
  ): Promise<SocialSettingsDTO>;
}
