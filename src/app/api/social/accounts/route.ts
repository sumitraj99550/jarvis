import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getBufferService } from "@/lib/buffer";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/buffer/types";

export const dynamic = "force-dynamic";

/** GET /api/social/accounts — list the signed-in user's connected accounts. */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const accounts = await getBufferService().listAccounts(user.id);
  return NextResponse.json({ accounts });
}

/**
 * POST /api/social/accounts
 * Body: { platform: SocialPlatform, handle: string }
 * Connects (or reconnects) an account.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let platform: SocialPlatform;
  let handle: string;

  try {
    const body = (await req.json()) as { platform?: unknown; handle?: unknown };
    if (
      typeof body.platform !== "string" ||
      !SOCIAL_PLATFORMS.includes(body.platform as SocialPlatform)
    ) {
      throw new Error(
        `'platform' must be one of: ${SOCIAL_PLATFORMS.join(", ")}`,
      );
    }
    if (typeof body.handle !== "string" || !body.handle.trim()) {
      throw new Error("'handle' is required.");
    }
    platform = body.platform as SocialPlatform;
    handle = body.handle.trim();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const account = await getBufferService().connectAccount(
    user.id,
    platform,
    handle,
  );

  return NextResponse.json({ account }, { status: 201 });
}
