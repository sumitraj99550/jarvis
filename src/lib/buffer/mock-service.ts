/**
 * MockBufferService — full local implementation of `BufferService`.
 * ---------------------------------------------------------------------------
 * Every feature (connected accounts, drafts, scheduling, publishing,
 * analytics, settings) works end-to-end against the local database. Only
 * the very last hop — actually reaching a social network — is mocked, via
 * `createUpdate()` in client.ts. Everything else (persistence, status
 * transitions, validation, ownership checks) is real.
 */

import { db } from "@/lib/db";
import { createUpdate } from "./client";
import type { BufferService } from "./service";
import {
  generateMockAnalytics,
  generateMockFollowers,
  type CreatePostInput,
  type SocialAccountDTO,
  type SocialAnalyticsSummary,
  type SocialPlatform,
  type SocialPostDTO,
  type SocialPostStatus,
  type SocialSettingsDTO,
  type UpdatePostInput,
  SOCIAL_PLATFORMS,
} from "./types";

// ---------------------------------------------------------------------------
// Row → DTO mapping
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAccountDTO(row: any): SocialAccountDTO {
  return {
    id: row.id,
    platform: row.platform,
    handle: row.handle,
    connected: row.connected,
    followers: row.followers,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPostDTO(row: any): SocialPostDTO {
  return {
    id: row.id,
    platform: row.platform,
    content: row.content,
    status: row.status,
    providerId: row.providerId ?? null,
    scheduledFor: row.scheduledFor
      ? new Date(row.scheduledFor).toISOString()
      : null,
    publishedAt: row.publishedAt
      ? new Date(row.publishedAt).toISOString()
      : null,
    impressions: row.impressions ?? 0,
    likes: row.likes ?? 0,
    clicks: row.clicks ?? 0,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

class MockBufferService implements BufferService {
  // ---------------------------------------------------------------------
  // Connected accounts
  // ---------------------------------------------------------------------

  async listAccounts(userId: string): Promise<SocialAccountDTO[]> {
    const rows = await db.socialAccount.findMany({
      where: { userId },
      orderBy: { platform: "asc" },
    });
    return rows.map(toAccountDTO);
  }

  async connectAccount(
    userId: string,
    platform: SocialPlatform,
    handle: string,
  ): Promise<SocialAccountDTO> {
    const followers = generateMockFollowers(`${userId}:${platform}`);

    const row = await db.socialAccount.upsert({
      where: { userId_platform: { userId, platform } },
      update: { connected: true, handle },
      create: { userId, platform, handle, connected: true, followers },
    });

    return toAccountDTO(row);
  }

  async disconnectAccount(
    userId: string,
    platform: SocialPlatform,
  ): Promise<void> {
    await db.socialAccount.updateMany({
      where: { userId, platform },
      data: { connected: false },
    });
  }

  private async assertConnected(userId: string, platform: SocialPlatform) {
    const account = await db.socialAccount.findUnique({
      where: { userId_platform: { userId, platform } },
    });
    if (!account || !account.connected) {
      throw new Error(
        `${platform} is not connected. Connect it from the Connected Accounts tab first.`,
      );
    }
  }

  // ---------------------------------------------------------------------
  // Posts
  // ---------------------------------------------------------------------

  async listPosts(
    userId: string,
    filter?: { status?: SocialPostStatus },
  ): Promise<SocialPostDTO[]> {
    const rows = await db.socialPost.findMany({
      where: { userId, ...(filter?.status ? { status: filter.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map(toPostDTO);
  }

  async getPost(userId: string, id: string): Promise<SocialPostDTO | null> {
    const row = await db.socialPost.findFirst({ where: { id, userId } });
    return row ? toPostDTO(row) : null;
  }

  async createPost(
    userId: string,
    input: CreatePostInput,
  ): Promise<SocialPostDTO> {
    const { platform, content, asDraft, scheduledFor } = input;

    if (asDraft) {
      const row = await db.socialPost.create({
        data: { userId, platform, content, status: "DRAFT" },
      });
      return toPostDTO(row);
    }

    await this.assertConnected(userId, platform);

    try {
      const update = await createUpdate({ platform, content, scheduledFor });
      const isPublished = update.status === "published";

      const row = await db.socialPost.create({
        data: {
          userId,
          platform,
          content,
          status: isPublished ? "PUBLISHED" : "SCHEDULED",
          providerId: update.providerId,
          scheduledFor: update.scheduledFor
            ? new Date(update.scheduledFor)
            : null,
          publishedAt: update.publishedAt ? new Date(update.publishedAt) : null,
          ...(isPublished
            ? generateMockAnalytics(update.providerId)
            : { impressions: 0, likes: 0, clicks: 0 }),
        },
      });

      return toPostDTO(row);
    } catch (err) {
      const row = await db.socialPost.create({
        data: { userId, platform, content, status: "FAILED" },
      });
      throw Object.assign(
        err instanceof Error ? err : new Error("Failed to schedule post."),
        { post: toPostDTO(row) },
      );
    }
  }

  async updatePost(
    userId: string,
    id: string,
    input: UpdatePostInput,
  ): Promise<SocialPostDTO> {
    const existing = await db.socialPost.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Post not found.");
    if (existing.status === "PUBLISHED") {
      throw new Error("Published posts can't be edited.");
    }

    const row = await db.socialPost.update({
      where: { id },
      data: {
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.scheduledFor !== undefined
          ? {
              scheduledFor: input.scheduledFor
                ? new Date(input.scheduledFor)
                : null,
              status: input.scheduledFor ? "SCHEDULED" : "DRAFT",
            }
          : {}),
      },
    });

    return toPostDTO(row);
  }

  async publishPost(userId: string, id: string): Promise<SocialPostDTO> {
    const existing = await db.socialPost.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Post not found.");
    if (existing.status === "PUBLISHED") {
      throw new Error("This post is already published.");
    }

    await this.assertConnected(userId, existing.platform as SocialPlatform);

    const update = await createUpdate({
      platform: existing.platform as SocialPlatform,
      content: existing.content,
    });

    const row = await db.socialPost.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        providerId: update.providerId,
        publishedAt: new Date(update.publishedAt ?? Date.now()),
        scheduledFor: null,
        ...generateMockAnalytics(update.providerId),
      },
    });

    return toPostDTO(row);
  }

  async deletePost(userId: string, id: string): Promise<void> {
    const existing = await db.socialPost.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Post not found.");
    await db.socialPost.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------

  async getAnalytics(userId: string): Promise<SocialAnalyticsSummary> {
    const posts = await db.socialPost.findMany({ where: { userId } });

    const byPlatform = Object.fromEntries(
      SOCIAL_PLATFORMS.map((p) => [
        p,
        { posts: 0, impressions: 0, likes: 0, clicks: 0 },
      ]),
    ) as SocialAnalyticsSummary["byPlatform"];

    let totalImpressions = 0;
    let totalLikes = 0;
    let totalClicks = 0;
    let totalPublished = 0;
    let totalScheduled = 0;
    let totalDrafts = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const post of posts as any[]) {
      const bucket = byPlatform[post.platform as SocialPlatform];
      bucket.posts += 1;
      bucket.impressions += post.impressions ?? 0;
      bucket.likes += post.likes ?? 0;
      bucket.clicks += post.clicks ?? 0;

      totalImpressions += post.impressions ?? 0;
      totalLikes += post.likes ?? 0;
      totalClicks += post.clicks ?? 0;

      if (post.status === "PUBLISHED") totalPublished += 1;
      if (post.status === "SCHEDULED") totalScheduled += 1;
      if (post.status === "DRAFT") totalDrafts += 1;
    }

    return {
      totalPosts: posts.length,
      totalPublished,
      totalScheduled,
      totalDrafts,
      totalImpressions,
      totalLikes,
      totalClicks,
      byPlatform,
    };
  }

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------

  async getSettings(userId: string): Promise<SocialSettingsDTO> {
    const row = await db.socialSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return {
      defaultPlatform: row.defaultPlatform,
      autoPublish: row.autoPublish,
    };
  }

  async updateSettings(
    userId: string,
    input: Partial<SocialSettingsDTO>,
  ): Promise<SocialSettingsDTO> {
    const row = await db.socialSettings.upsert({
      where: { userId },
      update: { ...input },
      create: {
        userId,
        defaultPlatform: input.defaultPlatform ?? "TWITTER",
        autoPublish: input.autoPublish ?? false,
      },
    });
    return {
      defaultPlatform: row.defaultPlatform,
      autoPublish: row.autoPublish,
    };
  }
}

export const mockBufferService = new MockBufferService();
