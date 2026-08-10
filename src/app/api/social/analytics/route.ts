import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getBufferService } from "@/lib/buffer";

export const dynamic = "force-dynamic";

/** GET /api/social/analytics — aggregate engagement summary across all posts. */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const analytics = await getBufferService().getAnalytics(user.id);
  return NextResponse.json({ analytics });
}
