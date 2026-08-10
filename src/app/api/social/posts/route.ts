import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getBufferService } from "@/lib/buffer";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/buffer/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "FAILED"] as const;

/**
 * GET /api/social/posts?status=DRAFT|SCHEDULED|PUBLISHED|FAILED
 *
 * Returns the signed-in user's social posts, most recent first. Optional
 * `status` query param filters by post status (used by the Drafts /
 * Scheduled / Published tabs).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = VALID_STATUSES.includes(
    statusParam as (typeof VALID_STATUSES)[number],
  )
    ? (statusParam as (typeof VALID_STATUSES)[number])
    : undefined;

  const posts = await getBufferService().listPosts(user.id, { status });
  return NextResponse.json({ posts });
}

/**
 * POST /api/social/posts
 * Body: { platform, content, asDraft?, scheduledFor? }
 *
 * Creates a draft, schedules a post, or publishes immediately depending on
 * which optional fields are present.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let platform: SocialPlatform;
  let content: string;
  let asDraft = false;
  let scheduledFor: string | undefined;

  try {
    const body = (await req.json()) as {
      platform?: unknown;
      content?: unknown;
      asDraft?: unknown;
      scheduledFor?: unknown;
    };

    if (
      typeof body.platform !== "string" ||
      !SOCIAL_PLATFORMS.includes(body.platform as SocialPlatform)
    ) {
      throw new Error(
        `'platform' must be one of: ${SOCIAL_PLATFORMS.join(", ")}`,
      );
    }
    if (typeof body.content !== "string" || !body.content.trim()) {
      throw new Error("'content' is required.");
    }

    platform = body.platform as SocialPlatform;
    content = body.content.trim();
    asDraft = body.asDraft === true;
    scheduledFor =
      typeof body.scheduledFor === "string" && body.scheduledFor
        ? body.scheduledFor
        : undefined;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const post = await getBufferService().createPost(user.id, {
      platform,
      content,
      asDraft,
      scheduledFor,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create post." },
      { status: 502 },
    );
  }
}
