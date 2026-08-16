"use client";

import { useState } from "react";
import {
  Loader2,
  Sparkles,
  CheckSquare,
  Headphones,
  Megaphone,
  Share2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { BriefingStats } from "@/lib/briefing/generate";

type BriefingDTO = {
  id: string;
  summary: string;
  stats: unknown;
  createdAt: string;
};

export function BriefingsView({
  initialBriefings,
}: {
  initialBriefings: BriefingDTO[];
}) {
  const [briefings, setBriefings] = useState(initialBriefings);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateNow() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/briefings/generate", { method: "POST" });
      const data = (await res.json()) as {
        briefing?: BriefingDTO;
        error?: string;
      };
      if (!res.ok || !data.briefing) {
        throw new Error(data.error ?? "Failed to generate briefing.");
      }
      setBriefings((prev) => [data.briefing as BriefingDTO, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted-foreground)]">
          {briefings.length} briefing{briefings.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={generateNow} disabled={generating}>
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Generate now
        </Button>
      </div>

      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}

      {briefings.length === 0 && !generating && (
        <p className="text-sm text-[var(--muted-foreground)]">
          No briefings yet. Click &quot;Generate now&quot; to create one, or
          wait for the worker&apos;s 8 AM UTC scheduled run.
        </p>
      )}

      <div className="space-y-3">
        {briefings.map((b) => (
          <BriefingCard key={b.id} briefing={b} />
        ))}
      </div>
    </div>
  );
}

function BriefingCard({ briefing }: { briefing: BriefingDTO }) {
  const stats = briefing.stats as BriefingStats | null;

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-xs text-[var(--muted-foreground)]">
          {formatDateTime(briefing.createdAt)}
        </p>
        <p className="text-sm text-[var(--foreground)]">{briefing.summary}</p>

        {stats && (
          <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-5">
            <Stat
              icon={CheckSquare}
              label="Tasks"
              value={`${stats.tasks.completed}/${stats.tasks.created}`}
            />
            <Stat
              icon={Headphones}
              label="Tickets"
              value={`${stats.tickets.resolved}/${stats.tickets.opened}`}
            />
            <Stat
              icon={Megaphone}
              label="Ad spend"
              value={`$${(stats.ads.spendCents / 100).toFixed(0)}`}
            />
            <Stat
              icon={Share2}
              label="Published"
              value={String(stats.social.published)}
            />
            <Stat
              icon={DollarSign}
              label="MRR"
              value={`$${(stats.revenue.mrrCents / 100).toFixed(0)}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-[var(--muted-foreground)]" />
      <div>
        <p className="text-xs text-[var(--foreground)]">{value}</p>
        <p className="text-[10px] text-[var(--muted-foreground)]">{label}</p>
      </div>
    </div>
  );
}
