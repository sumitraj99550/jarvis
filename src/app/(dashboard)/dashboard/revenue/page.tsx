import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { getRevenueCatService } from "@/lib/revenuecat";
import { RevenueDashboard } from "@/components/revenue/revenue-dashboard";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function RevenuePage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const service = getRevenueCatService();

  const [overview, products, subscribers, transactions, settings] =
    await Promise.all([
      service.getOverview(user.id),
      service.listProducts(user.id),
      service.listSubscribers(user.id),
      service.listTransactions(user.id),
      service.getSettings(user.id),
    ]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 11 — RevenueCat MCP Integration
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Revenue
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Subscribers, products, transactions, and MRR — running locally
            against seeded mock provider data.
          </p>
        </div>

        <RevenueDashboard
          initialOverview={overview}
          initialProducts={products}
          initialSubscribers={subscribers}
          initialTransactions={transactions}
          initialSettings={settings}
        />
      </div>
    </div>
  );
}
