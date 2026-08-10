import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getBufferService } from "@/lib/buffer";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/buffer/types";

export const dynamic = "force-dynamic";

/** GET /api/social/settings */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const settings = await getBufferService().getSettings(user.id);
  return NextResponse.json({ settings });
}

/**
 * PUT /api/social/settings
 * Body: { defaultPlatform?: SocialPlatform, autoPublish?: boolean }
 */
export async function PUT(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let defaultPlatform: SocialPlatform | undefined;
  let autoPublish: boolean | undefined;

  try {
    const body = (await req.json()) as {
      defaultPlatform?: unknown;
      autoPublish?: unknown;
    };

    if (body.defaultPlatform !== undefined) {
      if (
        typeof body.defaultPlatform !== "string" ||
        !SOCIAL_PLATFORMS.includes(body.defaultPlatform as SocialPlatform)
      ) {
        throw new Error(
          `'defaultPlatform' must be one of: ${SOCIAL_PLATFORMS.join(", ")}`,
        );
      }
      defaultPlatform = body.defaultPlatform as SocialPlatform;
    }
    if (body.autoPublish !== undefined) {
      if (typeof body.autoPublish !== "boolean") {
        throw new Error("'autoPublish' must be a boolean.");
      }
      autoPublish = body.autoPublish;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const settings = await getBufferService().updateSettings(user.id, {
    defaultPlatform,
    autoPublish,
  });

  return NextResponse.json({ settings });
}
