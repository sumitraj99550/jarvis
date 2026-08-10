import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { getBufferService } from "@/lib/buffer";
import { SocialDashboard } from "@/components/social/social-dashboard";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function SocialPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const service = getBufferService();

  const [accounts, posts, analytics, settings] = await Promise.all([
    service.listAccounts(user.id),
    service.listPosts(user.id),
    service.getAnalytics(user.id),
    service.getSettings(user.id),
  ]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 10 — Buffer MCP Integration
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Social Media
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Connected accounts, drafts, scheduling, publishing, and analytics —
            all running locally against mock provider data.
          </p>
        </div>

        <SocialDashboard
          initialAccounts={accounts}
          initialPosts={posts}
          initialAnalytics={analytics}
          initialSettings={settings}
        />
      </div>
    </div>
  );
}
