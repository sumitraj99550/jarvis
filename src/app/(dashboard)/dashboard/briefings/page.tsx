import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BriefingsView } from "@/components/briefings/briefings-view";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function BriefingsPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const rows = await db.briefing.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const briefings = rows.map((b: (typeof rows)[number]) => ({
    id: b.id as string,
    summary: b.summary as string,
    stats: b.stats,
    createdAt: new Date(b.createdAt as Date).toISOString(),
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 14 — Daily Briefing Engine
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Daily Briefings
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            AI-generated summaries of the last 24 hours, built from real tasks,
            tickets, campaigns, social posts, and revenue data. Generated
            automatically at 8 AM UTC by the background worker.
          </p>
        </div>

        <BriefingsView initialBriefings={briefings} />
      </div>
    </div>
  );
}
