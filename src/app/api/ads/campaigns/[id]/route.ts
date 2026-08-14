import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getMetaAdsService } from "@/lib/metaads";

export const dynamic = "force-dynamic";

/** GET /api/ads/campaigns/:id — campaign + 30 days of daily stats. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const detail = await getMetaAdsService().getCampaign(user.id, id);
  if (!detail) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
