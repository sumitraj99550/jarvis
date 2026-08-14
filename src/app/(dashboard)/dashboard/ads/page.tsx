import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { getMetaAdsService } from "@/lib/metaads";
import { AdsDashboard } from "@/components/ads/ads-dashboard";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function AdsPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const service = getMetaAdsService();

  const [overview, campaigns, audiences, settings] = await Promise.all([
    service.getOverview(user.id),
    service.listCampaigns(user.id),
    service.listAudiences(user.id),
    service.getSettings(user.id),
  ]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 12 — Meta Ads MCP Integration
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Meta Ads
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Campaigns, audiences, and spend — running locally against seeded
            mock provider data.
          </p>
        </div>

        <AdsDashboard
          initialOverview={overview}
          initialCampaigns={campaigns}
          initialAudiences={audiences}
          initialSettings={settings}
        />
      </div>
    </div>
  );
}
