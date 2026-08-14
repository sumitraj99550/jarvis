import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getMetaAdsService } from "@/lib/metaads";

export const dynamic = "force-dynamic";

const VALID_CURRENCIES = ["USD", "EUR", "GBP", "INR"];

/** GET /api/ads/settings */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const settings = await getMetaAdsService().getSettings(user.id);
  return NextResponse.json({ settings });
}

/** PUT /api/ads/settings — Body: { displayCurrency?, autoPauseOnBudget? } */
export async function PUT(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let displayCurrency: string | undefined;
  let autoPauseOnBudget: boolean | undefined;

  try {
    const body = (await req.json()) as {
      displayCurrency?: unknown;
      autoPauseOnBudget?: unknown;
    };

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
    if (body.autoPauseOnBudget !== undefined) {
      if (typeof body.autoPauseOnBudget !== "boolean") {
        throw new Error("'autoPauseOnBudget' must be a boolean.");
      }
      autoPauseOnBudget = body.autoPauseOnBudget;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const settings = await getMetaAdsService().updateSettings(user.id, {
    displayCurrency,
    autoPauseOnBudget,
  });
  return NextResponse.json({ settings });
}
