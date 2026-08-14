import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getRevenueCatService } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

/** GET /api/revenue/subscribers?search= — list (optionally filtered) subscribers. */
export async function GET(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") ?? undefined;

  const subscribers = await getRevenueCatService().listSubscribers(user.id, {
    search,
  });
  return NextResponse.json({ subscribers });
}
