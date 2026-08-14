import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getRevenueCatService } from "@/lib/revenuecat";
import type { TransactionType } from "@/lib/revenuecat/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: TransactionType[] = [
  "PURCHASE",
  "RENEWAL",
  "REFUND",
  "CANCELLATION",
  "PROMOTIONAL_GRANT",
];

/** GET /api/revenue/transactions?type= — recent transaction history. */
export async function GET(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const typeParam = req.nextUrl.searchParams.get("type");
  const type = VALID_TYPES.includes(typeParam as TransactionType)
    ? (typeParam as TransactionType)
    : undefined;

  const transactions = await getRevenueCatService().listTransactions(user.id, {
    type,
  });
  return NextResponse.json({ transactions });
}
