import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getRevenueCatService } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

/** GET /api/revenue/overview — MRR, active subscribers, churn, revenue by store. */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const overview = await getRevenueCatService().getOverview(user.id);
  return NextResponse.json({ overview });
}
