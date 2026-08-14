/**
 * Daily Briefing Engine (Phase 14).
 * ---------------------------------------------------------------------------
 * Replaces the Phase 9 stub. Pulls real 24-hour deltas from every module
 * that's actually shipped (Tasks, Support tickets, Meta Ads campaigns,
 * Social posts, Revenue), then asks Gemini to write a short narrative
 * summary from those real numbers — the same Gemini engine Command Center
 * and Support Center already use. No mock data anywhere in this file.
 */

import { db } from "@/lib/db";
import { sendMessage, type ChatTurn } from "@/lib/ai";

const DAY_MS = 24 * 60 * 60 * 1000;

export type BriefingStats = {
  tasks: { created: number; completed: number };
  tickets: { opened: number; resolved: number; escalated: number };
  ads: { spendCents: number; clicks: number; activeCampaigns: number };
  social: { published: number; scheduled: number };
  revenue: { mrrCents: number; newSubscribers: number };
};

async function gatherStats(): Promise<BriefingStats> {
  const since = new Date(Date.now() - DAY_MS);

  const [
    tasksCreated,
    tasksCompleted,
    ticketsOpened,
    ticketsResolved,
    ticketsEscalated,
    campaigns,
    socialPublished,
    socialScheduled,
    newSubscribers,
  ] = await Promise.all([
    db.task.count({ where: { createdAt: { gte: since } } }),
    db.task.count({ where: { status: "DONE", updatedAt: { gte: since } } }),
    db.ticket.count({ where: { createdAt: { gte: since } } }),
    db.ticket.count({
      where: { status: "RESOLVED", updatedAt: { gte: since } },
    }),
    db.ticket.count({
      where: { status: "ESCALATED", updatedAt: { gte: since } },
    }),
    db.campaign.findMany({ where: { status: "ACTIVE" } }),
    db.socialPost.count({
      where: { status: "PUBLISHED", publishedAt: { gte: since } },
    }),
    db.socialPost.count({ where: { status: "SCHEDULED" } }),
    db.revenueSubscriber.count({ where: { createdAt: { gte: since } } }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeCampaigns = campaigns as any[];
  const spendCents = activeCampaigns.reduce(
    (sum, c) => sum + Math.round(Number(c.spend) * 100),
    0,
  );
  const clicks = activeCampaigns.reduce((sum, c) => sum + c.clicks, 0);

  const subscriptions = await db.revenueSubscription.findMany({
    where: { status: "ACTIVE" },
    include: { product: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mrrCents = (subscriptions as any[]).reduce((sum, s) => {
    const monthly =
      s.product.period === "YEARLY"
        ? Math.round(s.product.priceCents / 12)
        : s.product.period === "WEEKLY"
          ? s.product.priceCents * 4
          : s.product.period === "LIFETIME"
            ? 0
            : s.product.priceCents;
    return sum + monthly;
  }, 0);

  return {
    tasks: { created: tasksCreated, completed: tasksCompleted },
    tickets: {
      opened: ticketsOpened,
      resolved: ticketsResolved,
      escalated: ticketsEscalated,
    },
    ads: {
      spendCents,
      clicks,
      activeCampaigns: activeCampaigns.length,
    },
    social: { published: socialPublished, scheduled: socialScheduled },
    revenue: { mrrCents, newSubscribers },
  };
}

function statsToPrompt(stats: BriefingStats): string {
  return `\
Write a short daily briefing (3-5 sentences, plain prose, no headers or \
bullet points) summarizing the last 24 hours of activity for a business \
using an AI operating system called JARVIS. Be direct and specific with \
the numbers given — don't invent any numbers not listed here. If a section \
had zero activity, you can skip mentioning it rather than forcing it in.

Tasks: ${stats.tasks.created} created, ${stats.tasks.completed} completed.
Support tickets: ${stats.tickets.opened} opened, ${stats.tickets.resolved} resolved, ${stats.tickets.escalated} escalated.
Ad campaigns: ${stats.ads.activeCampaigns} active, $${(stats.ads.spendCents / 100).toFixed(2)} total spend, ${stats.ads.clicks} clicks.
Social media: ${stats.social.published} posts published, ${stats.social.scheduled} scheduled.
Revenue: $${(stats.revenue.mrrCents / 100).toFixed(2)} MRR, ${stats.revenue.newSubscribers} new subscribers.`;
}

/**
 * Generates and persists today's briefing. Called by the worker's scheduled
 * job (8 AM UTC) and by the manual "Generate now" API route — same function,
 * same real data, same real Gemini call either way.
 */
export async function generateDailyBriefing(): Promise<{
  id: string;
  summary: string;
  stats: BriefingStats;
}> {
  const stats = await gatherStats();

  let summary: string;
  try {
    summary = await sendMessage(statsToPrompt(stats), [] as ChatTurn[]);
  } catch (err) {
    // GOOGLE_AI_API_KEY missing/invalid — don't fail the whole job, fall
    // back to a plain-text rendering of the real numbers so the briefing
    // still has real content, just without AI prose.
    summary =
      `Daily briefing (AI summary unavailable — ${
        err instanceof Error ? err.message : "AI engine error"
      }):\n\n` +
      `Tasks: ${stats.tasks.created} created, ${stats.tasks.completed} completed. ` +
      `Tickets: ${stats.tickets.opened} opened, ${stats.tickets.resolved} resolved. ` +
      `Ads: $${(stats.ads.spendCents / 100).toFixed(2)} spend across ${stats.ads.activeCampaigns} active campaigns. ` +
      `Social: ${stats.social.published} published. ` +
      `Revenue: $${(stats.revenue.mrrCents / 100).toFixed(2)} MRR.`;
  }

  const briefing = await db.briefing.create({
    data: { summary: summary.trim(), stats: stats as object },
  });

  return { id: briefing.id as string, summary: summary.trim(), stats };
}
