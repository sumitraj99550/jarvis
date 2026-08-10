import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getBufferService } from "@/lib/buffer";
import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/buffer/types";

export const dynamic = "force-dynamic";

/** DELETE /api/social/accounts/:platform — disconnects the account. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { platform } = await params;
  if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
    return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
  }

  await getBufferService().disconnectAccount(
    user.id,
    platform as SocialPlatform,
  );

  return NextResponse.json({ disconnected: true });
}
