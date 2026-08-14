import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getRevenueCatService } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

/** GET /api/revenue/products — the product/offering catalog. */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const products = await getRevenueCatService().listProducts(user.id);
  return NextResponse.json({ products });
}
