export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";

/**
 * Dashboard layout — protected shell for every /dashboard/* route.
 *
 * Why check auth here when middleware already protects the route?
 * Defence in depth: middleware runs at the edge and can be bypassed if the
 * matcher pattern is misconfigured. A server-side auth check here means a
 * misconfigured matcher never leaks private data — the layout catches it.
 *
 * Side-effect: calling getCurrentDbUser() here ensures the authenticated
 * Clerk user is synced into our Postgres `users` table on every page load.
 * In production the webhook (api/webhooks/clerk) handles this; this call
 * is a reliable fallback for local dev where webhooks aren't wired up.
 *
 * Phase 4 will extend this layout with the full sidebar, top navigation,
 * notification bell, and user menu. For now it is a clean pass-through so
 * each dashboard page controls its own layout.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Edge case guard — belt + suspenders alongside middleware
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Sync Clerk user → database (no-op if already synced via webhook)
  await getCurrentDbUser();

  return <>{children}</>;
}
