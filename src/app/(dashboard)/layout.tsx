import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentDbUser } from "@/lib/auth";
import { Shell } from "@/components/layout/shell";

export const dynamic = "force-dynamic";

/**
 * Cached user fetch for this render tree.
 *
 * React's `cache()` deduplicates calls within the same server render pass.
 * Both this layout AND the dashboard page call getCurrentDbUser() — without
 * cache() that would be two separate Postgres round-trips per page load.
 * With cache() it's one.
 *
 * The cache is per-request (React resets it between requests), so there is
 * no risk of serving stale user data across different visitors.
 */
const getCachedUser = cache(getCurrentDbUser);

/**
 * Dashboard layout — server component.
 *
 * Responsibilities:
 *  1. Auth guard (belt + suspenders on top of proxy.ts middleware).
 *  2. DB sync — ensures the Clerk user has a corresponding Prisma User row.
 *  3. Renders the client Shell (sidebar + top-nav + main area).
 *
 * The Shell is a client component that manages sidebar collapse state.
 * Children (individual dashboard pages) remain server components and are
 * passed through as React children — they render on the server and stream
 * into the shell's <main> slot.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth guard
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Sync Clerk → DB and get the current user record
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  return <Shell userRole={user.role}>{children}</Shell>;
}
