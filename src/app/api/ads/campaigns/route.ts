import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getMetaAdsService } from "@/lib/metaads";
import { OBJECTIVES, PLATFORMS } from "@/lib/metaads/types";
import type { CampaignObjective, AdPlatform } from "@/lib/metaads/types";

export const dynamic = "force-dynamic";

/** GET /api/ads/campaigns — list the signed-in user's campaigns. */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const campaigns = await getMetaAdsService().listCampaigns(user.id);
  return NextResponse.json({ campaigns });
}

/**
 * POST /api/ads/campaigns
 * Body: { name, objective, platform, budgetCents, dailyBudgetCents }
 * Creates a new campaign (starts ACTIVE, mirroring Meta's default on create).
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let name: string;
  let objective: CampaignObjective;
  let platform: AdPlatform;
  let budgetCents: number;
  let dailyBudgetCents: number;

  try {
    const body = (await req.json()) as {
      name?: unknown;
      objective?: unknown;
      platform?: unknown;
      budgetCents?: unknown;
      dailyBudgetCents?: unknown;
    };

    if (typeof body.name !== "string" || !body.name.trim()) {
      throw new Error("'name' is required.");
    }
    if (!OBJECTIVES.includes(body.objective as CampaignObjective)) {
      throw new Error(`'objective' must be one of: ${OBJECTIVES.join(", ")}`);
    }
    if (!PLATFORMS.includes(body.platform as AdPlatform)) {
      throw new Error(`'platform' must be one of: ${PLATFORMS.join(", ")}`);
    }
    if (typeof body.budgetCents !== "number" || body.budgetCents < 100) {
      throw new Error("'budgetCents' must be at least 100 ($1.00).");
    }
    if (
      typeof body.dailyBudgetCents !== "number" ||
      body.dailyBudgetCents < 100
    ) {
      throw new Error("'dailyBudgetCents' must be at least 100 ($1.00).");
    }

    name = body.name.trim();
    objective = body.objective as CampaignObjective;
    platform = body.platform as AdPlatform;
    budgetCents = body.budgetCents;
    dailyBudgetCents = body.dailyBudgetCents;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const campaign = await getMetaAdsService().createCampaign(user.id, {
    name,
    objective,
    platform,
    budgetCents,
    dailyBudgetCents,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
