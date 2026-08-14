import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getMetaAdsService } from "@/lib/metaads";
import type { CampaignStatus } from "@/lib/metaads/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: CampaignStatus[] = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
];

/**
 * POST /api/ads/campaigns/:id/status
 * Body: { status: "ACTIVE" | "PAUSED" | "COMPLETED" }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;

  let status: CampaignStatus;
  try {
    const body = (await req.json()) as { status?: unknown };
    if (!VALID_STATUSES.includes(body.status as CampaignStatus)) {
      throw new Error(`'status' must be one of: ${VALID_STATUSES.join(", ")}`);
    }
    status = body.status as CampaignStatus;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const campaign = await getMetaAdsService().updateCampaignStatus(
      user.id,
      id,
      status,
    );
    return NextResponse.json({ campaign });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update campaign.",
      },
      { status: 404 },
    );
  }
}
