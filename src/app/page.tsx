import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Phase 1 landing shell.
 *
 * This page exists purely to prove that the project compiles, the design
 * system (globals.css tokens) renders correctly, and the base UI primitives
 * (Button, Card) work together. It intentionally contains no real data,
 * no API calls, and no agent logic — those arrive in later phases.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="space-y-3 text-center">
        <p className="text-xs tracking-[0.3em] text-[var(--muted-foreground)] uppercase">
          AI Operating System
        </p>
        <h1 className="text-neon text-4xl font-semibold sm:text-5xl">JARVIS</h1>
        <p className="max-w-md text-sm text-[var(--muted-foreground)]">
          Phase 1 — Foundation online. Database, authentication, and the AI
          command center come online in the next phases.
        </p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="neon-glow">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Project scaffold</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-neon text-2xl font-semibold">Online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Design System</CardTitle>
            <CardDescription>Dark glassmorphism</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Phase</CardTitle>
            <CardDescription>Database &amp; Prisma</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">Pending</p>
          </CardContent>
        </Card>
      </div>

      <Button size="lg">Enter Command Center</Button>
    </main>
  );
}
