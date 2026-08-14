import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getRevenueCatService } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

/**
 * POST /api/revenue/subscribers/:id/grant
 * Body: { productId: string, days: number }
 * Grants a promotional entitlement — the one real "write" action in this phase.
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

  let productId: string;
  let days: number;

  try {
    const body = (await req.json()) as { productId?: unknown; days?: unknown };
    if (typeof body.productId !== "string" || !body.productId) {
      throw new Error("'productId' is required.");
    }
    if (typeof body.days !== "number" || body.days < 1 || body.days > 365) {
      throw new Error("'days' must be a number between 1 and 365.");
    }
    productId = body.productId;
    days = body.days;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const subscription =
      await getRevenueCatService().grantPromotionalEntitlement(user.id, {
        subscriberId: id,
        productId,
        days,
      });
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to grant." },
      { status: 400 },
    );
  }
}
