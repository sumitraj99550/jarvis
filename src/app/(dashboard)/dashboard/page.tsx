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
} from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
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
// Static stat cards (will be wired to real data from Phase 5+)
// ---------------------------------------------------------------------------
const STAT_CARDS = [
  {
    label: "AI Commands",
    value: "—",
    sub: "Live in Phase 5",
    icon: Terminal,
    phase: 5,
  },
  {
    label: "Voice Sessions",
    value: "—",
    sub: "Live in Phase 16",
    icon: Mic2,
    phase: 16,
  },
  {
    label: "Active Users",
    value: "—",
    sub: "Live in Phase 3 sync",
    icon: Users,
    phase: 3,
  },
  {
    label: "Automations Run",
    value: "—",
    sub: "Live in Phase 9",
    icon: Zap,
    phase: 9,
  },
] as const;

// ---------------------------------------------------------------------------
// System status items (real status checks for Phase 1–3 deliverables)
// ---------------------------------------------------------------------------
const SYSTEM_STATUS = [
  { label: "Database", status: "operational", icon: Database },
  { label: "Authentication", status: "operational", icon: ShieldCheck },
  { label: "AI Engine", status: "pending", icon: Cpu },
  { label: "Agent Orchestrator", status: "pending", icon: Activity },
  { label: "Background Jobs", status: "pending", icon: BarChart3 },
] as const;

// ---------------------------------------------------------------------------
// Roadmap items — shows progress through the 20 phases
// ---------------------------------------------------------------------------
const ROADMAP = [
  { phase: 1, label: "Foundation & Repo Setup", done: true },
  { phase: 2, label: "Database & ORM", done: true },
  { phase: 3, label: "Authentication & RBAC", done: true },
  { phase: 4, label: "App Shell & Design System", done: true },
  { phase: 5, label: "AI Command Center (text)", done: false },
  { phase: 6, label: "Streaming Responses", done: false },
  { phase: 7, label: "Hermes Orchestration Layer", done: false },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function DashboardPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const greeting = getGreeting();
  const displayName = user.name ?? user.email.split("@")[0];

  return (
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
            Phase 4 of 20 complete — shell &amp; design system online.
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
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
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
            {SYSTEM_STATUS.map(({ label, status, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 text-[var(--muted-foreground)]" />
                  <span className="text-sm text-[var(--foreground)]">
                    {label}
                  </span>
                </div>
                <Badge variant={status === "operational" ? "success" : "muted"}>
                  {status === "operational" ? "Operational" : "Pending"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Roadmap progress */}
        <Card>
          <CardHeader>
            <CardTitle>Build Roadmap</CardTitle>
            <CardDescription>20-phase implementation progress</CardDescription>
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
                Phases 8–20 unlocking progressively…
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
              title: "AI Command Center",
              desc: "Type natural-language commands. JARVIS executes them.",
              icon: Terminal,
              phase: 5,
            },
            {
              title: "Streaming Responses",
              desc: "Real-time token streaming for all AI responses.",
              icon: Activity,
              phase: 6,
            },
            {
              title: "Hermes Agent",
              desc: "Multi-tool orchestration layer with memory and planning.",
              icon: Cpu,
              phase: 7,
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
  );
}
