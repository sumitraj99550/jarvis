import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const ROADMAP = [
  { phase: 1, label: "Foundation & Repo Setup", done: true },
  { phase: 2, label: "Database & ORM", done: true },
  { phase: 3, label: "Authentication & RBAC", done: true },
  { phase: 4, label: "App Shell & Design System", done: true },
  { phase: 5, label: "AI Command Center (text)", done: true },
  { phase: 6, label: "Streaming Responses", done: true },
  { phase: 7, label: "Hermes Orchestration Layer", done: true },
  { phase: 8, label: "Human-in-the-Loop Approvals", done: true },
  { phase: 9, label: "Background Jobs Infrastructure", done: true },
  { phase: 10, label: "Buffer MCP Integration (Social)", done: true },
  { phase: 11, label: "RevenueCat MCP Integration", done: true },
  { phase: 12, label: "Meta Ads MCP Integration", done: true },
  { phase: 13, label: "Customer Support Agent", done: true },
  { phase: 14, label: "Daily Briefing Engine", done: true },
  { phase: 15, label: "Voice Layer (Text-to-Speech)", done: true },
  { phase: 16, label: "Voice Layer (STT + Wake Word)", done: true },
  { phase: 17, label: "Long-Term Memory & Knowledge Base", done: true },
  { phase: 18, label: "Notifications, Calendar, Task Management", done: true },
  { phase: 19, label: "Security, Monitoring, Cost Tracking", done: true },
  { phase: 20, label: "Production Deployment", done: true },
] as const;

export default function AboutPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            About JARVIS
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Build History
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            All 20 roadmap phases are complete. This page is the build log —
            your operational dashboard lives at{" "}
            <a
              href="/dashboard"
              className="text-[var(--primary)] hover:underline"
            >
              Dashboard
            </a>
            .
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>20-Phase Roadmap</CardTitle>
            <CardDescription>Every phase, in build order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {ROADMAP.map(({ phase, label, done }) => (
              <div key={phase} className="flex items-center gap-3">
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    done
                      ? "text-neon neon-glow bg-[var(--primary)]/20"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {phase}
                </div>
                <span
                  className={`flex-1 text-sm ${
                    done
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {label}
                </span>
                <Badge variant={done ? "success" : "muted"}>
                  {done ? "Done" : "Pending"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="glass-panel space-y-1.5 p-4">
          <p className="text-sm font-medium text-[var(--foreground)]">
            Want the details?
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            <code className="rounded bg-[var(--muted)] px-1">PROGRESS.md</code>{" "}
            (in the project root) has what&apos;s real vs. mock for every phase.{" "}
            <code className="rounded bg-[var(--muted)] px-1">
              DEPLOYMENT.md
            </code>{" "}
            covers taking this to production.{" "}
            <code className="rounded bg-[var(--muted)] px-1">
              IMPROVEMENT_PLAN.md
            </code>{" "}
            tracks post-launch work beyond the original 20 phases.
          </p>
        </div>
      </div>
    </div>
  );
}
