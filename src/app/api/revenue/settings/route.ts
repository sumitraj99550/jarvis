import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getRevenueCatService } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

const VALID_CURRENCIES = ["USD", "EUR", "GBP", "INR"];

/** GET /api/revenue/settings */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const settings = await getRevenueCatService().getSettings(user.id);
  return NextResponse.json({ settings });
}

/** PUT /api/revenue/settings — Body: { displayCurrency?: string } */
export async function PUT(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let displayCurrency: string | undefined;
  try {
    const body = (await req.json()) as { displayCurrency?: unknown };
    if (body.displayCurrency !== undefined) {
      if (
        typeof body.displayCurrency !== "string" ||
        !VALID_CURRENCIES.includes(body.displayCurrency)
      ) {
        throw new Error(
          `'displayCurrency' must be one of: ${VALID_CURRENCIES.join(", ")}`,
        );
      }
      displayCurrency = body.displayCurrency;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const settings = await getRevenueCatService().updateSettings(user.id, {
    displayCurrency,
  });
  return NextResponse.json({ settings });
}
