import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getMetaAdsService } from "@/lib/metaads";

export const dynamic = "force-dynamic";

/** GET /api/ads/audiences */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const audiences = await getMetaAdsService().listAudiences(user.id);
  return NextResponse.json({ audiences });
}

/** POST /api/ads/audiences — Body: { name, description? } */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let name: string;
  let description: string | undefined;

  try {
    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
    };
    if (typeof body.name !== "string" || !body.name.trim()) {
      throw new Error("'name' is required.");
    }
    name = body.name.trim();
    description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : undefined;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const audience = await getMetaAdsService().createAudience(user.id, {
    name,
    description,
  });

  return NextResponse.json({ audience }, { status: 201 });
}
