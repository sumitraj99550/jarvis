import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getMetaAdsService } from "@/lib/metaads";

export const dynamic = "force-dynamic";

/** GET /api/ads/overview — total spend, impressions, clicks, CTR, by-platform breakdown. */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const overview = await getMetaAdsService().getOverview(user.id);
  return NextResponse.json({ overview });
}
