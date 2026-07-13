export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";

/**
 * Dashboard home page  (/dashboard).
 *
 * This is the Phase 1 shell made real: authenticated, personalised, and
 * backed by a live database user record. The Status / Design System / Next
 * Phase cards from Phase 1 are preserved; we've added the user's name,
 * role badge, and a sign-out button so the auth round-trip is visible.
 *
 * Phase 4 will replace this with the full JARVIS command-center layout.
 */
export default async function DashboardPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      {/* Header */}
      <div className="space-y-3 text-center">
        <p className="text-xs tracking-[0.3em] text-[var(--muted-foreground)] uppercase">
          AI Operating System
        </p>
        <h1 className="text-neon text-4xl font-semibold sm:text-5xl">JARVIS</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Welcome back,{" "}
          <span className="text-[var(--foreground)]">
            {user.name ?? user.email}
          </span>
        </p>

        {/* Role badge */}
        <span className="inline-block rounded border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--muted-foreground)]">
          {user.role}
        </span>
      </div>

      {/* Status cards — carried over from Phase 1 */}
      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="neon-glow">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Auth + database</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-neon text-2xl font-semibold">Online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signed in as</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{user.role}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Phase</CardTitle>
            <CardDescription>Full dashboard shell</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">Phase 4</p>
          </CardContent>
        </Card>
      </div>

      {/* Sign out */}
      <SignOutButton redirectUrl="/sign-in">
        <Button variant="outline">Sign out</Button>
      </SignOutButton>
    </main>
  );
}
