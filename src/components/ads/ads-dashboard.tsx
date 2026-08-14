"use client";

import { useState, useTransition } from "react";
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Percent,
  Loader2,
  Plus,
  Pause,
  Play,
  ChevronDown,
  ChevronRight,
  Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  OBJECTIVES,
  OBJECTIVE_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
  type AdPlatform,
  type AdsOverview,
  type AdsSettingsDTO,
  type AudienceDTO,
  type CampaignDTO,
  type CampaignObjective,
  type CampaignStatus,
  type DailyStatDTO,
} from "@/lib/metaads/types";

const TABS = ["overview", "campaigns", "audiences", "settings"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  campaigns: "Campaigns",
  audiences: "Audiences",
  settings: "Settings",
};

const STATUS_VARIANT: Record<
  CampaignStatus,
  "success" | "default" | "muted" | "destructive"
> = {
  ACTIVE: "success",
  PAUSED: "muted",
  DRAFT: "default",
  COMPLETED: "muted",
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function fmt(n: number) {
  return n.toLocaleString();
}

export function AdsDashboard({
  initialOverview,
  initialCampaigns,
  initialAudiences,
  initialSettings,
}: {
  initialOverview: AdsOverview;
  initialCampaigns: CampaignDTO[];
  initialAudiences: AudienceDTO[];
  initialSettings: AdsSettingsDTO;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview] = useState(initialOverview);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [audiences, setAudiences] = useState(initialAudiences);
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--border)] pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab overview={overview} currency={settings.displayCurrency} />
      )}

      {tab === "campaigns" && (
        <CampaignsTab
          campaigns={campaigns}
          setCampaigns={setCampaigns}
          currency={settings.displayCurrency}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      {tab === "audiences" && (
        <AudiencesTab
          audiences={audiences}
          setAudiences={setAudiences}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      {tab === "settings" && (
        <SettingsTab
          settings={settings}
          setSettings={setSettings}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({
  overview,
  currency,
}: {
  overview: AdsOverview;
  currency: string;
}) {
  const maxSpend = Math.max(
    1,
    ...PLATFORMS.map((p) => overview.byPlatform[p].spendCents),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total spend",
            value: money(overview.totalSpendCents, currency),
            icon: DollarSign,
          },
          {
            label: "Impressions",
            value: fmt(overview.totalImpressions),
            icon: Eye,
          },
          {
            label: "Clicks",
            value: fmt(overview.totalClicks),
            icon: MousePointerClick,
          },
          {
            label: "CTR",
            value: `${(overview.ctr * 100).toFixed(2)}%`,
            icon: Percent,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
                <Icon className="text-neon size-4" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {value}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
            Spend by platform
          </p>
          {PLATFORMS.map((platform) => {
            const s = overview.byPlatform[platform];
            const width = Math.round((s.spendCents / maxSpend) * 100);
            return (
              <div key={platform} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)]">
                    {PLATFORM_LABELS[platform]}
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    {s.campaigns} campaigns · {money(s.spendCents, currency)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-[11px] text-[var(--muted-foreground)]">
        Figures are computed from seeded mock campaigns — real Meta data arrives
        once RealMetaAdsService is wired up.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaigns tab
// ---------------------------------------------------------------------------

function CampaignsTab({
  campaigns,
  setCampaigns,
  currency,
  isPending,
  startTransition,
}: {
  campaigns: CampaignDTO[];
  setCampaigns: React.Dispatch<React.SetStateAction<CampaignDTO[]>>;
  currency: string;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<CampaignObjective>("TRAFFIC");
  const [platform, setPlatform] = useState<AdPlatform>("FACEBOOK");
  const [budget, setBudget] = useState(1000);
  const [dailyBudget, setDailyBudget] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function createCampaign() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ads/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            objective,
            platform,
            budgetCents: Math.round(budget * 100),
            dailyBudgetCents: Math.round(dailyBudget * 100),
          }),
        });
        const data = (await res.json()) as {
          campaign?: CampaignDTO;
          error?: string;
        };
        if (!res.ok || !data.campaign) {
          throw new Error(data.error ?? "Failed to create campaign.");
        }
        setCampaigns((prev) => [data.campaign as CampaignDTO, ...prev]);
        setName("");
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function toggleStatus(campaign: CampaignDTO) {
    const nextStatus: CampaignStatus =
      campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    startTransition(async () => {
      const res = await fetch(`/api/ads/campaigns/${campaign.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const data = (await res.json()) as { campaign: CampaignDTO };
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaign.id ? data.campaign : c)),
        );
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" />
          New campaign
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-[11px] text-[var(--muted-foreground)]">
                Objective
                <select
                  value={objective}
                  onChange={(e) =>
                    setObjective(e.target.value as CampaignObjective)
                  }
                  className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {OBJECTIVES.map((o) => (
                    <option key={o} value={o}>
                      {OBJECTIVE_LABELS[o]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-[var(--muted-foreground)]">
                Platform
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as AdPlatform)}
                  className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-[var(--muted-foreground)]">
                Lifetime budget ($)
                <input
                  type="number"
                  min={1}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-[var(--muted-foreground)]">
                Daily budget ($)
                <input
                  type="number"
                  min={1}
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                />
              </label>
            </div>
            <Button
              size="sm"
              disabled={isPending || !name.trim()}
              onClick={createCampaign}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create campaign
            </Button>
            {error && (
              <p className="text-xs text-[var(--destructive)]">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-4 pb-4">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  {expandedId === c.id ? (
                    <ChevronDown className="size-4 text-[var(--muted-foreground)]" />
                  ) : (
                    <ChevronRight className="size-4 text-[var(--muted-foreground)]" />
                  )}
                  <div>
                    <p className="text-sm text-[var(--foreground)]">{c.name}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {PLATFORM_LABELS[c.platform]} ·{" "}
                      {OBJECTIVE_LABELS[c.objective]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-[var(--foreground)]">
                      {money(c.spendCents, currency)}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      of {money(c.budgetCents, currency)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  {(c.status === "ACTIVE" || c.status === "PAUSED") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(c);
                      }}
                      aria-label={c.status === "ACTIVE" ? "Pause" : "Resume"}
                    >
                      {c.status === "ACTIVE" ? (
                        <Pause className="size-4 text-[var(--muted-foreground)]" />
                      ) : (
                        <Play className="size-4 text-[var(--muted-foreground)]" />
                      )}
                    </Button>
                  )}
                </div>
              </button>

              {expandedId === c.id && (
                <CampaignDetail campaignId={c.id} currency={currency} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CampaignDetail({
  campaignId,
  currency,
}: {
  campaignId: string;
  currency: string;
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DailyStatDTO[]>([]);

  useState(() => {
    fetch(`/api/ads/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then((data: { dailyStats?: DailyStatDTO[] }) => {
        setStats(data.dailyStats ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return null;
  });

  if (loading) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
        <Loader2 className="size-3.5 animate-spin" /> Loading performance…
      </p>
    );
  }

  if (stats.length === 0) {
    return (
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
        No performance data yet — this campaign hasn&apos;t run.
      </p>
    );
  }

  const maxClicks = Math.max(1, ...stats.map((s) => s.clicks));

  return (
    <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
      <p className="text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
        Last {stats.length} days
      </p>
      <div className="flex h-16 items-end gap-0.5">
        {stats.map((s) => (
          <div
            key={s.date}
            title={`${new Date(s.date).toLocaleDateString()}: ${s.clicks} clicks, ${money(s.spendCents, currency)}`}
            className="flex-1 rounded-t bg-[var(--primary)]/60"
            style={{ height: `${Math.max(4, (s.clicks / maxClicks) * 100)}%` }}
          />
        ))}
      </div>
      <p className="text-[11px] text-[var(--muted-foreground)]">
        Bar height = daily clicks. Hover a bar for exact figures.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audiences tab
// ---------------------------------------------------------------------------

function AudiencesTab({
  audiences,
  setAudiences,
  isPending,
  startTransition,
}: {
  audiences: AudienceDTO[];
  setAudiences: React.Dispatch<React.SetStateAction<AudienceDTO[]>>;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function create() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ads/audiences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
          }),
        });
        const data = (await res.json()) as {
          audience?: AudienceDTO;
          error?: string;
        };
        if (!res.ok || !data.audience) {
          throw new Error(data.error ?? "Failed to create audience.");
        }
        setAudiences((prev) => [data.audience as AudienceDTO, ...prev]);
        setName("");
        setDescription("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Audience name"
              className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </div>
          <Button
            size="sm"
            disabled={isPending || !name.trim()}
            onClick={create}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create audience
          </Button>
          {error && (
            <p className="text-xs text-[var(--destructive)]">{error}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {audiences.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
                  <Users2 className="size-3.5 text-[var(--muted-foreground)]" />
                  {a.name}
                </p>
                {a.description && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {a.description}
                  </p>
                )}
              </div>
              <p className="text-sm text-[var(--foreground)]">
                {fmt(a.sizeEstimate)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

function SettingsTab({
  settings,
  setSettings,
  isPending,
  startTransition,
}: {
  settings: AdsSettingsDTO;
  setSettings: React.Dispatch<React.SetStateAction<AdsSettingsDTO>>;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  function save(patch: Partial<AdsSettingsDTO>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    startTransition(async () => {
      await fetch("/api/ads/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
            Display currency
          </p>
          <div className="flex flex-wrap gap-2">
            {["USD", "EUR", "GBP", "INR"].map((c) => (
              <button
                key={c}
                type="button"
                disabled={isPending}
                onClick={() => save({ displayCurrency: c })}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  settings.displayCurrency === c
                    ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Auto-pause on budget
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Campaigns automatically pause once lifetime spend reaches their
              budget.
            </p>
          </div>
          <Button
            variant={settings.autoPauseOnBudget ? "default" : "outline"}
            size="sm"
            disabled={isPending}
            onClick={() =>
              save({ autoPauseOnBudget: !settings.autoPauseOnBudget })
            }
          >
            {settings.autoPauseOnBudget ? "Enabled" : "Disabled"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
