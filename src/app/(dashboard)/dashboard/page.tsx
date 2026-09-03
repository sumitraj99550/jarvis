import { cache } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Terminal,
  Mic2,
  Users,
  Zap,
  CalendarDays,
  CheckSquare,
  Bell,
  MessageSquare,
  ArrowRight,
  Info,
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
import { formatDateTime, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// Deduplicate within the same render pass (layout already called this)
const getCachedUser = cache(getCurrentDbUser);

// ---------------------------------------------------------------------------
// Greeting helper
// ---------------------------------------------------------------------------
function getGreeting(): string {
  const hour = new Date().getUTCHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Stat cards — real data, never a number without a real query behind it.
// ---------------------------------------------------------------------------
async function getStatCards() {
  const [conversationCount, userCount] = await Promise.all([
    db.conversation.count(),
    db.user.count(),
  ]);

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
    },
    {
      label: "Voice Sessions",
      value: "Live",
      sub: "Browser-based (STT/TTS)",
      icon: Mic2,
    },
    {
      label: "Active Users",
      value: String(userCount),
      sub: "Total registered users",
      icon: Users,
    },
    {
      label: "Background Jobs",
      value: completedJobs === null ? "—" : String(completedJobs),
      sub:
        completedJobs === null
          ? "Worker unreachable — is `npm run worker` running?"
          : "Completed jobs (heartbeat, sync, briefings)",
      icon: Zap,
    },
  ] as const;
}

// ---------------------------------------------------------------------------
// Live operational data — what's actually happening today, not build progress
// ---------------------------------------------------------------------------
async function getTodayData(userId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [todayEvents, upcomingTasks, recentNotifications, recentConversations] =
    await Promise.all([
      db.calendarEvent.findMany({
        where: { userId, startAt: { gte: startOfToday, lte: endOfToday } },
        orderBy: { startAt: "asc" },
        take: 5,
      }),
      db.task.findMany({
        where: {
          userId,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueDate: { lte: in7Days },
        },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.conversation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    todayEvents,
    upcomingTasks,
    recentNotifications,
    recentConversations,
  };
}

function isOverdue(dueDate: Date | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function DashboardPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const greeting = getGreeting();
  const displayName = user.name ?? user.email.split("@")[0];
  const [statCards, today] = await Promise.all([
    getStatCards(),
    getTodayData(user.id),
  ]);

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
              Here&apos;s what&apos;s happening today.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="default">{user.role}</Badge>
            <Link
              href="/dashboard/about"
              title="Build history & roadmap"
              className="flex size-6 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              <Info className="size-4" />
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Stat cards                                                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => {
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
        {/* Today & Upcoming Tasks                                            */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-[var(--muted-foreground)]" />
                    Today
                  </CardTitle>
                  <CardDescription>Your calendar for today</CardDescription>
                </div>
                <Link
                  href="/dashboard/calendar"
                  className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                >
                  View calendar <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {today.todayEvents.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nothing on your calendar today.
                </p>
              )}
              {today.todayEvents.map(
                (e: (typeof today.todayEvents)[number]) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-[var(--foreground)]">{e.title}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {e.allDay ? "All day" : formatTime(e.startAt)}
                    </span>
                  </div>
                ),
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="size-4 text-[var(--muted-foreground)]" />
                    Upcoming Tasks
                  </CardTitle>
                  <CardDescription>Due within 7 days</CardDescription>
                </div>
                <Link
                  href="/dashboard/tasks"
                  className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                >
                  View tasks <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {today.upcomingTasks.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nothing due soon.
                </p>
              )}
              {today.upcomingTasks.map(
                (t: (typeof today.upcomingTasks)[number]) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-[var(--foreground)]">
                      {t.title}
                    </span>
                    {t.dueDate && (
                      <Badge
                        variant={isOverdue(t.dueDate) ? "destructive" : "muted"}
                      >
                        {isOverdue(t.dueDate)
                          ? "Overdue"
                          : formatDateTime(t.dueDate)}
                      </Badge>
                    )}
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Notifications & Recent AI Activity                                */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-4 text-[var(--muted-foreground)]" />
                Notifications
              </CardTitle>
              <CardDescription>
                Most recent activity across JARVIS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {today.recentNotifications.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No notifications yet.
                </p>
              )}
              {today.recentNotifications.map(
                (n: (typeof today.recentNotifications)[number]) => (
                  <div key={n.id} className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                    )}
                    <div className={n.read ? "ml-3.5" : undefined}>
                      <p className="text-sm text-[var(--foreground)]">
                        {n.title}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-[var(--muted-foreground)]" />
                    Recent AI Activity
                  </CardTitle>
                  <CardDescription>
                    Your last few Command Center chats
                  </CardDescription>
                </div>
                <Link
                  href="/dashboard/command"
                  className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                >
                  Open chat <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {today.recentConversations.length === 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No conversations yet — say hello in Command Center.
                </p>
              )}
              {today.recentConversations.map(
                (c: (typeof today.recentConversations)[number]) => (
                  <div key={c.id}>
                    <p className="truncate text-sm text-[var(--foreground)]">
                      {c.message}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
