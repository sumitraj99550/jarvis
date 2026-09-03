"use client";

import { useState } from "react";
import { DollarSign, Zap, Hash, ShieldCheck, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatNumber } from "@/lib/format";

type UsageData = {
  last30Days: {
    totalCalls: number;
    totalTokens: number;
    totalCostDisplay: string;
  };
  byFeature: Array<{
    feature: string;
    calls: number;
    totalTokens: number;
    costDisplay: string;
  }>;
  recent: Array<{
    id: string;
    feature: string;
    model: string;
    totalTokens: number;
    costDisplay: string;
    user: string;
    createdAt: string;
  }>;
};

type SystemStatusItem = {
  label: string;
  status: "operational" | "unreachable" | "not configured";
  href?: string;
};

const TABS = ["system", "usage", "security"] as const;
type Tab = (typeof TABS)[number];

export function SettingsView({
  usage,
  canViewUsage,
  systemStatus,
}: {
  usage: UsageData | null;
  canViewUsage: boolean;
  systemStatus: readonly SystemStatusItem[];
}) {
  const [tab, setTab] = useState<Tab>("system");

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5 border-b border-[var(--border)] pb-3">
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
            {t === "system"
              ? "System Status"
              : t === "usage"
                ? "Usage & Cost"
                : "Security"}
          </button>
        ))}
      </div>

      {tab === "system" && <SystemStatusTab systemStatus={systemStatus} />}

      {tab === "usage" && (
        <UsageTab usage={usage} canViewUsage={canViewUsage} />
      )}
      {tab === "security" && <SecurityTab />}
    </div>
  );
}

function SystemStatusTab({
  systemStatus,
}: {
  systemStatus: readonly SystemStatusItem[];
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
          Real-time health of all JARVIS subsystems
        </p>
        {systemStatus.map(({ label, status, href }) => (
          <div key={label} className="flex items-center justify-between">
            {href ? (
              <a
                href={href}
                className="text-sm text-[var(--foreground)] underline-offset-2 hover:underline"
              >
                {label}
              </a>
            ) : (
              <span className="text-sm text-[var(--foreground)]">{label}</span>
            )}
            <Badge variant={status === "operational" ? "success" : "muted"}>
              {status === "operational"
                ? "Operational"
                : status === "unreachable"
                  ? "Unreachable"
                  : "Not configured"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function UsageTab({
  usage,
  canViewUsage,
}: {
  usage: UsageData | null;
  canViewUsage: boolean;
}) {
  if (!canViewUsage) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Usage &amp; cost tracking is visible to MANAGER role and above.
      </p>
    );
  }
  if (!usage) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">No usage data.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
              <Zap className="text-neon size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {formatNumber(usage.last30Days.totalCalls)}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                AI calls (30d)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
              <Hash className="text-neon size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {formatNumber(usage.last30Days.totalTokens)}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Total tokens (30d)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
              <DollarSign className="text-neon size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {usage.last30Days.totalCostDisplay}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Est. cost (30d)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
            By feature
          </p>
          {usage.byFeature.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)]">
              No AI usage recorded yet.
            </p>
          )}
          {usage.byFeature.map((f) => (
            <div
              key={f.feature}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-[var(--foreground)]">{f.feature}</span>
              <span className="text-[var(--muted-foreground)]">
                {f.calls} calls · {formatNumber(f.totalTokens)} tokens ·{" "}
                {f.costDisplay}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
            Recent calls
          </p>
          {usage.recent.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between border-b border-[var(--border)] pb-1.5 text-xs last:border-0"
            >
              <div>
                <span className="text-[var(--foreground)]">{r.feature}</span>
                <span className="ml-1.5 text-[var(--muted-foreground)]">
                  {r.user} · {formatDateTime(r.createdAt)}
                </span>
              </div>
              <span className="text-[var(--muted-foreground)]">
                {formatNumber(r.totalTokens)}t · {r.costDisplay}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[11px] text-[var(--muted-foreground)]">
        Costs are estimated from Gemini&apos;s published paid-tier pricing
        purely for visibility — this app runs on the free tier, so actual dollar
        cost is $0. Token counts are real, read directly from each Gemini API
        response.
      </p>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex items-start gap-3 pt-6">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
          <div>
            <p className="text-sm text-[var(--foreground)]">Rate limiting</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Redis-backed, real limits: 20 chat messages / 5 min and 10 Hermes
              agent runs / 5 min, per user. Returns HTTP 429 with a Retry-After
              header when exceeded.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-start gap-3 pt-6">
          <Lock className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
          <div>
            <p className="text-sm text-[var(--foreground)]">Security headers</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and
              Permissions-Policy are set on every response (see{" "}
              <code className="rounded bg-[var(--muted)] px-1">
                next.config.mjs
              </code>
              ). Content-Security-Policy is deliberately deferred to Phase 20
              (Production Deployment) — getting it wrong locally risks silently
              breaking Clerk sign-in.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-start gap-3 pt-6">
          <Badge variant="default">RBAC</Badge>
          <div>
            <p className="text-sm text-[var(--foreground)]">
              Role-based access control
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              ADMIN / MANAGER / SUPPORT / VIEWER, enforced server-side on every
              sensitive route (Audit Logs, this Usage tab) via{" "}
              <code className="rounded bg-[var(--muted)] px-1">
                requireRole()
              </code>
              — see{" "}
              <code className="rounded bg-[var(--muted)] px-1">
                /dashboard/audit
              </code>{" "}
              for the audit trail of every tool call and approval.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
