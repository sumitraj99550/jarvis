"use client";

import { useState, useTransition } from "react";
import {
  DollarSign,
  Users,
  TrendingDown,
  Gift,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  STORE_LABELS,
  STORES,
  type ProductDTO,
  type RevenueOverview,
  type RevenueSettingsDTO,
  type SubscriberDTO,
  type SubscriptionDTO,
  type TransactionDTO,
} from "@/lib/revenuecat/types";

const TABS = [
  "overview",
  "subscribers",
  "products",
  "transactions",
  "settings",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  subscribers: "Subscribers",
  products: "Products",
  transactions: "Transactions",
  settings: "Settings",
};

const STATUS_VARIANT: Record<
  SubscriptionDTO["status"],
  "success" | "default" | "muted" | "destructive"
> = {
  ACTIVE: "success",
  IN_TRIAL: "default",
  CANCELLED: "muted",
  EXPIRED: "muted",
  BILLING_ISSUE: "destructive",
};

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function RevenueDashboard({
  initialOverview,
  initialProducts,
  initialSubscribers,
  initialTransactions,
  initialSettings,
}: {
  initialOverview: RevenueOverview;
  initialProducts: ProductDTO[];
  initialSubscribers: SubscriberDTO[];
  initialTransactions: TransactionDTO[];
  initialSettings: RevenueSettingsDTO;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview] = useState(initialOverview);
  const [products] = useState(initialProducts);
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [transactions, setTransactions] = useState(initialTransactions);
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

      {tab === "subscribers" && (
        <SubscribersTab
          subscribers={subscribers}
          setSubscribers={setSubscribers}
          products={products}
          currency={settings.displayCurrency}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}

      {tab === "products" && (
        <ProductsTab products={products} currency={settings.displayCurrency} />
      )}

      {tab === "transactions" && (
        <TransactionsTab
          transactions={transactions}
          setTransactions={setTransactions}
          currency={settings.displayCurrency}
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
  overview: RevenueOverview;
  currency: string;
}) {
  const maxStoreRevenue = Math.max(
    1,
    ...STORES.map((s) => overview.byStore[s].revenueCents),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
              <DollarSign className="text-neon size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {money(overview.mrrCents, currency)}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">MRR</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
              <Users className="text-neon size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {overview.activeSubscribers}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Active subscribers
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
              <Gift className="text-neon size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {overview.trialSubscribers}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">In trial</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-9 items-center justify-center rounded-md bg-[var(--primary)]/10">
              <TrendingDown className="text-neon size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                {overview.churnedThisMonth}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Churned (30d)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
            Revenue by store
          </p>
          {STORES.map((store) => {
            const s = overview.byStore[store];
            const width = Math.round((s.revenueCents / maxStoreRevenue) * 100);
            return (
              <div key={store} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)]">
                    {STORE_LABELS[store]}
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    {s.subscribers} subs · {money(s.revenueCents, currency)}
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
        All figures are computed from seeded mock subscribers — real RevenueCat
        data arrives once RealRevenueCatService is wired up.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subscribers tab
// ---------------------------------------------------------------------------

function SubscribersTab({
  subscribers,
  setSubscribers,
  products,
  currency,
  isPending,
  startTransition,
}: {
  subscribers: SubscriberDTO[];
  setSubscribers: React.Dispatch<React.SetStateAction<SubscriberDTO[]>>;
  products: ProductDTO[];
  currency: string;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function runSearch(value: string) {
    setSearch(value);
    startTransition(async () => {
      const res = await fetch(
        `/api/revenue/subscribers?search=${encodeURIComponent(value)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { subscribers: SubscriberDTO[] };
        setSubscribers(data.subscribers);
      }
    });
  }

  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => runSearch(e.target.value)}
        placeholder="Search by app user id or email…"
        className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      />

      {isPending && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <Loader2 className="size-3.5 animate-spin" /> Loading…
        </p>
      )}

      {subscribers.length === 0 && !isPending && (
        <p className="text-sm text-[var(--muted-foreground)]">
          No subscribers match this search.
        </p>
      )}

      <div className="space-y-2">
        {subscribers.map((sub) => (
          <Card key={sub.id}>
            <CardContent className="pt-4 pb-4">
              <button
                type="button"
                onClick={() =>
                  setExpandedId(expandedId === sub.id ? null : sub.id)
                }
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  {expandedId === sub.id ? (
                    <ChevronDown className="size-4 text-[var(--muted-foreground)]" />
                  ) : (
                    <ChevronRight className="size-4 text-[var(--muted-foreground)]" />
                  )}
                  <div>
                    <p className="font-mono text-xs text-[var(--foreground)]">
                      {sub.appUserId}
                    </p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {sub.email ?? "No email on file"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-xs text-[var(--foreground)]">
                      {money(sub.lifetimeValueCents, currency)}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      LTV
                    </p>
                  </div>
                  <Badge
                    variant={sub.activeSubscriptions > 0 ? "success" : "muted"}
                  >
                    {sub.activeSubscriptions > 0 ? "Active" : "No active sub"}
                  </Badge>
                </div>
              </button>

              {expandedId === sub.id && (
                <SubscriberDetail
                  subscriberId={sub.id}
                  products={products}
                  currency={currency}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SubscriberDetail({
  subscriberId,
  products,
  currency,
}: {
  subscriberId: string;
  products: ProductDTO[];
  currency: string;
}) {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDTO[]>([]);
  const [txns, setTxns] = useState<TransactionDTO[]>([]);
  const [grantProductId, setGrantProductId] = useState(products[0]?.id ?? "");
  const [grantDays, setGrantDays] = useState(30);
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch once on mount (component keyed by subscriberId via parent expand toggle)
  useState(() => {
    fetch(`/api/revenue/subscribers/${subscriberId}`)
      .then((r) => r.json())
      .then(
        (data: {
          subscriptions?: SubscriptionDTO[];
          transactions?: TransactionDTO[];
        }) => {
          setSubscriptions(data.subscriptions ?? []);
          setTxns(data.transactions ?? []);
          setLoading(false);
        },
      )
      .catch(() => setLoading(false));
    return null;
  });

  async function grant() {
    setGranting(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/revenue/subscribers/${subscriberId}/grant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: grantProductId, days: grantDays }),
        },
      );
      const data = (await res.json()) as {
        subscription?: SubscriptionDTO;
        error?: string;
      };
      if (!res.ok || !data.subscription) {
        throw new Error(data.error ?? "Failed to grant.");
      }
      setSubscriptions((prev) => [
        data.subscription as SubscriptionDTO,
        ...prev,
      ]);
      setMessage(
        `Granted ${grantDays} days of ${data.subscription.productName}.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGranting(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
        <Loader2 className="size-3.5 animate-spin" /> Loading detail…
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
      <div>
        <p className="mb-1.5 text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
          Subscriptions
        </p>
        <div className="space-y-1.5">
          {subscriptions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-[var(--foreground)]">{s.productName}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted-foreground)]">
                  {STORE_LABELS[s.store]}
                </span>
                <Badge variant={STATUS_VARIANT[s.status]}>{s.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold tracking-widest text-[var(--muted-foreground)] uppercase">
          Recent transactions
        </p>
        <div className="space-y-1.5">
          {txns.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-[var(--muted-foreground)]">
                {t.type} · {t.productName}
              </span>
              <span className="text-[var(--foreground)]">
                {money(t.amountCents, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-3">
        <label className="flex flex-col gap-1 text-[11px] text-[var(--muted-foreground)]">
          Product
          <select
            value={grantProductId}
            onChange={(e) => setGrantProductId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-[var(--muted-foreground)]">
          Days
          <input
            type="number"
            min={1}
            max={365}
            value={grantDays}
            onChange={(e) => setGrantDays(Number(e.target.value))}
            className="w-20 rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </label>
        <Button
          size="sm"
          onClick={grant}
          disabled={granting || !grantProductId}
        >
          {granting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Gift className="size-4" />
          )}
          Grant promotional
        </Button>
      </div>

      {message && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <AlertTriangle className="size-3.5" />
          {message}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Products tab
// ---------------------------------------------------------------------------

function ProductsTab({
  products,
  currency,
}: {
  products: ProductDTO[];
  currency: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {products.map((p) => (
        <Card key={p.id}>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                {p.name}
              </p>
              <p className="font-mono text-[11px] text-[var(--muted-foreground)]">
                {p.productId}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--foreground)]">
                {money(p.priceCents, currency)}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {p.period.toLowerCase()}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transactions tab
// ---------------------------------------------------------------------------

function TransactionsTab({
  transactions,
  setTransactions,
  currency,
  isPending,
  startTransition,
}: {
  transactions: TransactionDTO[];
  setTransactions: React.Dispatch<React.SetStateAction<TransactionDTO[]>>;
  currency: string;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  const [type, setType] = useState("");

  function filter(value: string) {
    setType(value);
    startTransition(async () => {
      const params = new URLSearchParams();
      if (value) params.set("type", value);
      const res = await fetch(`/api/revenue/transactions?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { transactions: TransactionDTO[] };
        setTransactions(data.transactions);
      }
    });
  }

  return (
    <div className="space-y-3">
      <select
        value={type}
        onChange={(e) => filter(e.target.value)}
        className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <option value="">All types</option>
        <option value="PURCHASE">Purchase</option>
        <option value="RENEWAL">Renewal</option>
        <option value="REFUND">Refund</option>
        <option value="CANCELLATION">Cancellation</option>
        <option value="PROMOTIONAL_GRANT">Promotional grant</option>
      </select>

      {isPending && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <Loader2 className="size-3.5 animate-spin" /> Loading…
        </p>
      )}

      <Card>
        <CardContent className="space-y-2 pt-6">
          {transactions.length === 0 && !isPending && (
            <p className="text-sm text-[var(--muted-foreground)]">
              No transactions match this filter.
            </p>
          )}
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border-b border-[var(--border)] pb-2 text-xs last:border-0 last:pb-0"
            >
              <div>
                <p className="text-[var(--foreground)]">
                  {t.type} · {t.productName}
                </p>
                <p className="font-mono text-[10px] text-[var(--muted-foreground)]">
                  {t.subscriberAppUserId} ·{" "}
                  {new Date(t.occurredAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-[var(--foreground)]">
                {money(t.amountCents, currency)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
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
  settings: RevenueSettingsDTO;
  setSettings: React.Dispatch<React.SetStateAction<RevenueSettingsDTO>>;
  isPending: boolean;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  function save(currency: string) {
    setSettings({ displayCurrency: currency });
    startTransition(async () => {
      await fetch("/api/revenue/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayCurrency: currency }),
      });
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm font-medium text-[var(--foreground)]">
          Display currency
        </p>
        <div className="flex flex-wrap gap-2">
          {["USD", "EUR", "GBP", "INR"].map((c) => (
            <button
              key={c}
              type="button"
              disabled={isPending}
              onClick={() => save(c)}
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
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Affects how figures are formatted across this dashboard. Underlying
          amounts are always stored in cents.
        </p>
      </CardContent>
    </Card>
  );
}
