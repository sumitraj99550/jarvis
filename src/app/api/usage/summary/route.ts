import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { microsToDisplayCost, usageWindowSince } from "@/lib/usage/pricing";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/summary — MANAGER+ only. Org-wide AI usage/cost, last 30
 * days, broken down by feature. Every number here is a real aggregate of
 * `AiUsageLog` rows, each written from an actual Gemini API response.
 */
export async function GET() {
  try {
    await requireRole("MANAGER");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forbidden." },
      { status: 403 },
    );
  }

  const since = usageWindowSince();

  const [totalAgg, byFeature, recent] = await Promise.all([
    db.aiUsageLog.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, estimatedCostMicros: true },
      _count: true,
    }),
    db.aiUsageLog.groupBy({
      by: ["feature"],
      where: { createdAt: { gte: since } },
      _sum: { totalTokens: true, estimatedCostMicros: true },
      _count: true,
      orderBy: { _sum: { estimatedCostMicros: "desc" } },
    }),
    db.aiUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    last30Days: {
      totalCalls: totalAgg._count,
      totalTokens: totalAgg._sum.totalTokens ?? 0,
      totalCostMicros: totalAgg._sum.estimatedCostMicros ?? 0,
      totalCostDisplay: microsToDisplayCost(
        totalAgg._sum.estimatedCostMicros ?? 0,
      ),
    },
    byFeature: byFeature.map(
      (f: {
        feature: string;
        _count: number;
        _sum: {
          totalTokens: number | null;
          estimatedCostMicros: number | null;
        };
      }) => ({
        feature: f.feature,
        calls: f._count,
        totalTokens: f._sum.totalTokens ?? 0,
        costDisplay: microsToDisplayCost(f._sum.estimatedCostMicros ?? 0),
      }),
    ),
    recent: recent.map((r: (typeof recent)[number]) => ({
      id: r.id,
      feature: r.feature,
      model: r.model,
      totalTokens: r.totalTokens,
      costDisplay: microsToDisplayCost(r.estimatedCostMicros),
      user: r.user?.name ?? r.user?.email ?? "system",
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
