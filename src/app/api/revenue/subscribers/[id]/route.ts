import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getRevenueCatService } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

/** GET /api/revenue/subscribers/:id — subscriber + subscriptions + transactions. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const detail = await getRevenueCatService().getSubscriberDetail(user.id, id);
  if (!detail) {
    return NextResponse.json(
      { error: "Subscriber not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(detail);
}
