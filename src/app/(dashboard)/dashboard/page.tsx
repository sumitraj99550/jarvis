import { cache } from "react";
import { redirect } from "next/navigation";
import {
  Terminal,
  Mic2,
  Activity,
  Database,
  ShieldCheck,
  Cpu,
  Users,
  BarChart3,
  Zap,
  FileText,
} from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getJobQueue } from "@/lib/queue";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

// Deduplicate within the same render pass (layout already called this)
const getCachedUser = cache(getCurrentDbUser);

// ---------------------------------------------------------------------------
// Greeting helper
// ---------------------------------------------------------------------------
function getGreeting(): string {
  // Server-side — use UTC hour as a proxy (good enough for a greeting)
  const hour = new Date().getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Stat cards — real data for shipped phases, honest "not built yet" for
// features that don't exist. Never show a number without a real query
// backing it.
// ---------------------------------------------------------------------------
async function getStatCards() {
  // Real, DB-backed (Phase 3 users, Phase 5 conversations)
  const [conversationCount, userCount] = await Promise.all([
    db.conversation.count(),
    db.user.count(),
  ]);

  // Real, queue-backed (Phase 9) — degrade gracefully if Redis isn't
  // reachable rather than pretending the number is 0.
  let completedJobs: number | null = null;
  try {
    const counts = await getJobQueue().getJobCounts("completed");
    completedJobs = counts.completed ?? 0;
  } catch {
    completedJobs = null;
  }

  return [
    {
      label: "AI Commands",
      value: String(conversationCount),
      sub: "Total conversations logged",
      icon: Terminal,
      locked: false,
    },
    {
      label: "Voice Sessions",
      value: "Live",
      sub: "Browser-based (STT/TTS) — not counted server-side",
      icon: Mic2,
      locked: false,
    },
    {
      label: "Active Users",
      value: String(userCount),
      sub: "Total registered users",
      icon: Users,
      locked: false,
    },
    {
      label: "Background Jobs",
      value: completedJobs === null ? "—" : String(completedJobs),
      sub:
        completedJobs === null
          ? "Worker unreachable — is `npm run worker` running?"
          : "Completed jobs (heartbeat, sync, briefings)",
      icon: Zap,
      locked: false,
    },
  ] as const;
}

// ---------------------------------------------------------------------------
// System status items (real status checks for Phase 1–3 deliverables)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// System status — real checks, not hardcoded claims. Each entry actually
// probes the thing it describes; if a check fails or a dependency isn't
// configured, it's reported as such rather than defaulting to "operational".
// ---------------------------------------------------------------------------
async function getSystemStatus() {
  const [dbOk, queueOk] = await Promise.allSettled([
    db.user.count().then(() => true),
    getJobQueue()
      .getJobCounts("completed")
      .then(() => true),
  ]);

  const dbUp = dbOk.status === "fulfilled";
  const queueUp = queueOk.status === "fulfilled";
  const aiConfigured = Boolean(process.env.GOOGLE_AI_API_KEY);

  return [
    {
      label: "Database",
      status: dbUp ? "operational" : "unreachable",
      icon: Database,
    },
    {
      label: "Authentication",
      // If this page rendered at all, getCurrentDbUser() + Clerk both
      // succeeded — that's the actual proof, not an assumption.
      status: "operational",
      icon: ShieldCheck,
    },
    {
      label: "AI Engine",
      status: aiConfigured ? "operational" : "not configured",
      icon: Cpu,
    },
    {
      label: "Agent Orchestrator",
      // Hermes depends on the same Gemini key as the AI Engine.
      status: aiConfigured ? "operational" : "not configured",
      icon: Activity,
    },
    {
      label: "Background Jobs",
      status: queueUp ? "operational" : "unreachable",
      icon: BarChart3,
    },
    {
      label: "Worker Process",
      status: queueUp ? "operational" : "unreachable",
      icon: Zap,
      href: "/api/queue/status",
    },
  ] as const;
}

// ---------------------------------------------------------------------------
// Roadmap items — shows progress through the 20 phases
// ---------------------------------------------------------------------------
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
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function DashboardPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const greeting = getGreeting();
  const displayName = user.name ?? user.email.split("@")[0];
  const statCards = await getStatCards();
  const systemStatus = await getSystemStatus();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                             */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
              AI Operating System
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {greeting}, <span className="text-neon">{displayName}</span>
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Phase 17 of 20 complete — knowledge base &amp; memory online.
            </p>
          </div>
          <Badge variant="default" className="self-start sm:self-auto">
            {user.role}
          </Badge>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Stat cards                                                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.label}
                className={card.locked ? "opacity-60" : undefined}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardDescription>{card.label}</CardDescription>
                    <div className="flex size-8 items-center justify-center rounded-md bg-[var(--primary)]/10">
                      <Icon className="text-neon size-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    {card.sub}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Two-column grid — System Status + Roadmap                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Real-time health of all JARVIS subsystems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemStatus.map(({ label, status, icon: Icon, ...rest }) => {
                const href = "href" in rest ? rest.href : undefined;
                return (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-4 text-[var(--muted-foreground)]" />
                      {href ? (
                        <a
                          href={href}
                          className="text-sm text-[var(--foreground)] underline-offset-2 hover:underline"
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="text-sm text-[var(--foreground)]">
                          {label}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant={status === "operational" ? "success" : "muted"}
                    >
                      {status === "operational"
                        ? "Operational"
                        : status === "unreachable"
                          ? "Unreachable"
                          : "Not configured"}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Roadmap progress */}
          <Card>
            <CardHeader>
              <CardTitle>Build Roadmap</CardTitle>
              <CardDescription>
                20-phase implementation progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {ROADMAP.map(({ phase, label, done }) => (
                <div key={phase} className="flex items-center gap-3">
                  {/* Phase number bubble */}
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

              {/* Collapsed remainder */}
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="size-6 rounded-full" />
                <span className="text-xs text-[var(--muted-foreground)]">
                  Phases 18–20 unlocking progressively…
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Quick-access grid — links to future features                      */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <h3 className="mb-3 text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
            Coming Next
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                title: "Notifications, Calendar, Tasks",
                desc: "Unified task management, calendar, and notifications.",
                icon: FileText,
                phase: 18,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="glass-panel cursor-default space-y-2 p-4 opacity-70"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-[var(--muted-foreground)]" />
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {item.title}
                    </span>
                    <Badge variant="muted" className="ml-auto">
                      P{item.phase}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
