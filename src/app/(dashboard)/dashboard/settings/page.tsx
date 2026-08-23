import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { microsToDisplayCost, usageWindowSince } from "@/lib/usage/pricing";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function SettingsPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const canViewUsage = await hasRole("MANAGER");

  let usage = null;
  if (canViewUsage) {
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

    usage = {
      last30Days: {
        totalCalls: totalAgg._count,
        totalTokens: totalAgg._sum.totalTokens ?? 0,
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
    };
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 19 — Security, Monitoring &amp; Cost Tracking
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Settings
          </h2>
        </div>

        <SettingsView usage={usage} canViewUsage={canViewUsage} />
      </div>
    </div>
  );
}
