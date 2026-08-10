/**
 * Local string-union types mirroring the Prisma `SocialPlatform` and
 * `SocialPostStatus` enums. Defined locally (same pattern as `Role` in
 * src/lib/auth.ts) so this module compiles before `prisma generate` has
 * run — the generated `@prisma/client` enum types don't exist until then.
 */

export type SocialPlatform = "TWITTER" | "LINKEDIN" | "INSTAGRAM" | "FACEBOOK";

export type SocialPostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "TWITTER",
  "LINKEDIN",
  "INSTAGRAM",
  "FACEBOOK",
];

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  TWITTER: "Twitter / X",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
};

// ---------------------------------------------------------------------------
// Shapes exchanged between the UI, the service layer, and the provider
// ---------------------------------------------------------------------------

export type SocialAccountDTO = {
  id: string;
  platform: SocialPlatform;
  handle: string;
  connected: boolean;
  followers: number;
};

export type SocialPostDTO = {
  id: string;
  platform: SocialPlatform;
  content: string;
  status: SocialPostStatus;
  providerId: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  impressions: number;
  likes: number;
  clicks: number;
  createdAt: string;
};

export type CreatePostInput = {
  platform: SocialPlatform;
  content: string;
  /** Save as a draft instead of scheduling/publishing. */
  asDraft?: boolean;
  /** ISO timestamp — omit (and asDraft=false) to publish immediately. */
  scheduledFor?: string;
};

export type UpdatePostInput = {
  content?: string;
  scheduledFor?: string | null;
};

export type SocialAnalyticsSummary = {
  totalPosts: number;
  totalPublished: number;
  totalScheduled: number;
  totalDrafts: number;
  totalImpressions: number;
  totalLikes: number;
  totalClicks: number;
  byPlatform: Record<
    SocialPlatform,
    { posts: number; impressions: number; likes: number; clicks: number }
  >;
};

export type SocialSettingsDTO = {
  defaultPlatform: SocialPlatform;
  autoPublish: boolean;
};

// ---------------------------------------------------------------------------
// Deterministic mock-analytics helper
// ---------------------------------------------------------------------------

/**
 * Generates believable-but-fake engagement numbers for a freshly published
 * post. Seeded off the post id so numbers are stable across re-fetches
 * (not re-randomized on every request) rather than truly random.
 */
export function generateMockAnalytics(seed: string): {
  impressions: number;
  likes: number;
  clicks: number;
} {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const impressions = 200 + (hash % 4800);
  const likes = Math.round(impressions * (0.02 + ((hash >> 3) % 8) / 100));
  const clicks = Math.round(impressions * (0.01 + ((hash >> 6) % 5) / 100));
  return { impressions, likes, clicks };
}

/** Deterministic mock follower count for a freshly connected account. */
export function generateMockFollowers(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 17 + seed.charCodeAt(i)) >>> 0;
  }
  return 500 + (hash % 24500);
}
