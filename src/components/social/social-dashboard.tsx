"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Send,
  Trash2,
  Loader2,
  AlertTriangle,
  Link2,
  Unlink,
  Pencil,
  UploadCloud,
  Eye,
  Heart,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
  type SocialAccountDTO,
  type SocialAnalyticsSummary,
  type SocialPlatform,
  type SocialPostDTO,
  type SocialPostStatus,
  type SocialSettingsDTO,
} from "@/lib/buffer/types";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<
  SocialPostStatus,
  "success" | "default" | "muted" | "destructive"
> = {
  PUBLISHED: "success",
  SCHEDULED: "default",
  DRAFT: "muted",
  FAILED: "destructive",
};

const TABS = [
  "accounts",
  "create",
  "drafts",
  "scheduled",
  "published",
  "analytics",
  "settings",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  accounts: "Connected Accounts",
  create: "Create Post",
  drafts: "Drafts",
  scheduled: "Scheduled",
  published: "Published",
  analytics: "Analytics",
  settings: "Settings",
};

function fmt(n: number) {
  return formatNumber(n);
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export function SocialDashboard({
  initialAccounts,
  initialPosts,
  initialAnalytics,
  initialSettings,
}: {
  initialAccounts: SocialAccountDTO[];
  initialPosts: SocialPostDTO[];
  initialAnalytics: SocialAnalyticsSummary;
  initialSettings: SocialSettingsDTO;
}) {
  const [tab, setTab] = useState<Tab>("create");
  const [accounts, setAccounts] = useState(initialAccounts);
  const [posts, setPosts] = useState(initialPosts);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();

  const connectedPlatforms = useMemo(
    () => new Set(accounts.filter((a) => a.connected).map((a) => a.platform)),
    [accounts],
  );

  const drafts = posts.filter((p) => p.status === "DRAFT");
  const scheduled = posts.filter((p) => p.status === "SCHEDULED");
  const published = posts.filter((p) => p.status === "PUBLISHED");

  // -------------------------------------------------------------------------
  // Shared mutators
  // -------------------------------------------------------------------------

  function refreshAnalytics() {
    startTransition(async () => {
      const res = await fetch("/api/social/analytics");
      if (res.ok) {
        const data = (await res.json()) as {
          analytics: SocialAnalyticsSummary;
        };
        setAnalytics(data.analytics);
      }
    });
  }

  function addOrUpdatePost(post: SocialPostDTO) {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      if (idx === -1) return [post, ...prev];
      const next = [...prev];
      next[idx] = post;
      return next;
    });
    refreshAnalytics();
  }

  function removePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    refreshAnalytics();
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
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
            {t === "drafts" && drafts.length > 0 && (
              <span className="ml-1.5 opacity-70">({drafts.length})</span>
            )}
            {t === "scheduled" && scheduled.length > 0 && (
              <span className="ml-1.5 opacity-70">({scheduled.length})</span>
            )}
          </button>
        ))}
      </div>

      {tab === "accounts" && (
        <AccountsTab
          accounts={accounts}
          setAccounts={setAccounts}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      {tab === "create" && (
        <CreateTab
          connectedPlatforms={connectedPlatforms}
          defaultPlatform={settings.defaultPlatform}
          onCreated={addOrUpdatePost}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      {(tab === "drafts" || tab === "scheduled") && (
        <PostListTab
          posts={tab === "drafts" ? drafts : scheduled}
          emptyLabel={
            tab === "drafts" ? "No drafts yet." : "Nothing scheduled yet."
          }
          editable
          onUpdated={addOrUpdatePost}
          onDeleted={removePost}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      {tab === "published" && (
        <PostListTab
          posts={published}
          emptyLabel="Nothing published yet."
          editable={false}
          onUpdated={addOrUpdatePost}
          onDeleted={removePost}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      {tab === "analytics" && <AnalyticsTab analytics={analytics} />}

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
// Connected Accounts tab
// ---------------------------------------------------------------------------

function AccountsTab({
  accounts,
  setAccounts,
  isPending,
  startTransition,
}: {
  accounts: SocialAccountDTO[];
  setAccounts: React.Dispatch<React.SetStateAction<SocialAccountDTO[]>>;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  function connect(platform: SocialPlatform) {
    startTransition(async () => {
      const res = await fetch("/api/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle: `@your-${platform.toLowerCase()}-handle`,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { account: SocialAccountDTO };
        setAccounts((prev) => {
          const idx = prev.findIndex((a) => a.platform === platform);
          if (idx === -1) return [...prev, data.account];
          const next = [...prev];
          next[idx] = data.account;
          return next;
        });
      }
    });
  }

  function disconnect(platform: SocialPlatform) {
    startTransition(async () => {
      const res = await fetch(`/api/social/accounts/${platform}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.platform === platform ? { ...a, connected: false } : a,
          ),
        );
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {SOCIAL_PLATFORMS.map((platform) => {
        const account = accounts.find((a) => a.platform === platform);
        const connected = account?.connected ?? false;

        return (
          <Card key={platform}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {PLATFORM_LABELS[platform]}
                </p>
                {connected ? (
                  <>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {account?.handle}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {fmt(account?.followers ?? 0)} followers (mock)
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Not connected
                  </p>
                )}
              </div>
              <Button
                variant={connected ? "outline" : "default"}
                size="sm"
                disabled={isPending}
                onClick={() =>
                  connected ? disconnect(platform) : connect(platform)
                }
              >
                {connected ? (
                  <Unlink className="size-3.5" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                {connected ? "Disconnect" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Post tab
// ---------------------------------------------------------------------------

function CreateTab({
  connectedPlatforms,
  defaultPlatform,
  onCreated,
  isPending,
  startTransition,
}: {
  connectedPlatforms: Set<SocialPlatform>;
  defaultPlatform: SocialPlatform;
  onCreated: (post: SocialPostDTO) => void;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  const [platform, setPlatform] = useState<SocialPlatform>(defaultPlatform);
  const [content, setContent] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(asDraft: boolean) {
    if (!content.trim()) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/social/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform,
            content: content.trim(),
            asDraft,
            scheduledFor: asDraft ? undefined : scheduledFor || undefined,
          }),
        });
        const data = (await res.json()) as {
          post?: SocialPostDTO;
          error?: string;
        };
        if (!res.ok || !data.post) {
          throw new Error(data.error ?? "Failed to create post.");
        }
        onCreated(data.post);
        setContent("");
        setScheduledFor("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const isConnected = connectedPlatforms.has(platform);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap gap-2">
          {SOCIAL_PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                platform === p
                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {PLATFORM_LABELS[p]}
              {!connectedPlatforms.has(p) && (
                <span className="ml-1 opacity-60">(disconnected)</span>
              )}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Write your ${PLATFORM_LABELS[platform]} post…`}
          rows={4}
          className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            Schedule for (optional)
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>

          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending || !content.trim()}
              onClick={() => submit(true)}
            >
              Save draft
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || !content.trim() || !isConnected}
              onClick={() => submit(false)}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {scheduledFor ? "Schedule" : "Post now"}
            </Button>
          </div>
        </div>

        {!isConnected && (
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="size-3.5" />
            {PLATFORM_LABELS[platform]} isn&apos;t connected — you can still
            save a draft, but scheduling/posting needs a connected account.
          </p>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--destructive)]">
            <AlertTriangle className="size-3.5" />
            {error}
          </p>
        )}

        <p className="text-[11px] text-[var(--muted-foreground)]">
          Running against a mock provider — Buffer&apos;s free tier has no API
          access, so no real post is published yet. Everything else (drafts,
          scheduling, publishing, analytics) works for real, locally.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Drafts / Scheduled / Published list tab
// ---------------------------------------------------------------------------

function PostListTab({
  posts,
  emptyLabel,
  editable,
  onUpdated,
  onDeleted,
  isPending,
  startTransition,
}: {
  posts: SocialPostDTO[];
  emptyLabel: string;
  editable: boolean;
  onUpdated: (post: SocialPostDTO) => void;
  onDeleted: (id: string) => void;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");

  function startEdit(post: SocialPostDTO) {
    setEditingId(post.id);
    setDraftContent(post.content);
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/social/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent }),
      });
      if (res.ok) {
        const data = (await res.json()) as { post: SocialPostDTO };
        onUpdated(data.post);
        setEditingId(null);
      }
    });
  }

  function publishNow(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/social/posts/${id}/publish`, {
        method: "POST",
      });
      if (res.ok) {
        const data = (await res.json()) as { post: SocialPostDTO };
        onUpdated(data.post);
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/social/posts/${id}`, {
        method: "DELETE",
      });
      if (res.ok) onDeleted(id);
    });
  }

  if (posts.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">{emptyLabel}</p>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {PLATFORM_LABELS[post.platform]}
                  </span>
                  <Badge variant={STATUS_VARIANT[post.status]}>
                    {post.status}
                  </Badge>
                </div>

                {editingId === post.id ? (
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                ) : (
                  <p className="text-sm break-words text-[var(--foreground)]">
                    {post.content}
                  </p>
                )}

                <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
                  {post.status === "SCHEDULED" && post.scheduledFor
                    ? `Scheduled for ${formatDateTime(post.scheduledFor)}`
                    : post.status === "PUBLISHED" && post.publishedAt
                      ? `Published ${formatDateTime(post.publishedAt)}`
                      : formatDateTime(post.createdAt)}
                </p>

                {post.status === "PUBLISHED" && (
                  <div className="mt-2 flex gap-4 text-[11px] text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" /> {fmt(post.impressions)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="size-3" /> {fmt(post.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="size-3" />{" "}
                      {fmt(post.clicks)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                {editable && editingId === post.id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => saveEdit(post.id)}
                  >
                    Save
                  </Button>
                ) : (
                  editable && (
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => startEdit(post)}
                      aria-label="Edit post"
                    >
                      <Pencil className="size-4 text-[var(--muted-foreground)]" />
                    </Button>
                  )
                )}

                {editable && (
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => publishNow(post.id)}
                    aria-label="Publish now"
                  >
                    <UploadCloud className="size-4 text-[var(--muted-foreground)]" />
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => remove(post.id)}
                  aria-label="Delete post"
                >
                  <Trash2 className="size-4 text-[var(--muted-foreground)]" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics tab
// ---------------------------------------------------------------------------

function AnalyticsTab({ analytics }: { analytics: SocialAnalyticsSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total posts", value: analytics.totalPosts },
          { label: "Published", value: analytics.totalPublished },
          { label: "Scheduled", value: analytics.totalScheduled },
          { label: "Drafts", value: analytics.totalDrafts },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-semibold text-[var(--foreground)]">
                {fmt(stat.value)}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Impressions",
            value: analytics.totalImpressions,
            icon: Eye,
          },
          { label: "Likes", value: analytics.totalLikes, icon: Heart },
          {
            label: "Clicks",
            value: analytics.totalClicks,
            icon: MousePointerClick,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
                <Icon className="text-neon size-4" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {fmt(value)}
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
            By platform
          </p>
          {SOCIAL_PLATFORMS.map((platform) => {
            const stats = analytics.byPlatform[platform];
            const maxImpr = Math.max(
              1,
              ...SOCIAL_PLATFORMS.map(
                (p) => analytics.byPlatform[p].impressions,
              ),
            );
            const width = Math.round((stats.impressions / maxImpr) * 100);
            return (
              <div key={platform} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)]">
                    {PLATFORM_LABELS[platform]}
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    {fmt(stats.posts)} posts · {fmt(stats.impressions)} impr.
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
        Engagement numbers are deterministic mock data generated per post — real
        analytics arrive once RealBufferService is wired up.
      </p>
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
  settings: SocialSettingsDTO;
  setSettings: React.Dispatch<React.SetStateAction<SocialSettingsDTO>>;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  function save(patch: Partial<SocialSettingsDTO>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    startTransition(async () => {
      await fetch("/api/social/settings", {
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
            Default platform
          </p>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={isPending}
                onClick={() => save({ defaultPlatform: p })}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  settings.defaultPlatform === p
                    ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
            Pre-selected platform when opening Create Post.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Auto-publish via Hermes
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              When enabled, JARVIS can post to social media through chat without
              a manual approval step. Off by default — social posting is a
              critical-risk action.
            </p>
          </div>
          <Button
            variant={settings.autoPublish ? "default" : "outline"}
            size="sm"
            disabled={isPending}
            onClick={() => save({ autoPublish: !settings.autoPublish })}
          >
            {settings.autoPublish ? "Enabled" : "Disabled"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
