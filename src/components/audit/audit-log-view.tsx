"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

type AuditLogRow = {
  id: string;
  action: string;
  status: string;
  payload: unknown;
  createdAt: string;
  user: { name: string | null; email: string } | null;
};

const STATUS_VARIANT: Record<
  string,
  "success" | "default" | "muted" | "destructive"
> = {
  executed: "success",
  pending_approval: "default",
  rejected: "muted",
  failed: "destructive",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "executed", label: "Executed" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
];

export function AuditLogView({
  initialLogs,
  initialNextCursor,
}: {
  initialLogs: AuditLogRow[];
  initialNextCursor: string | null;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [status, setStatus] = useState("");
  const [action, setAction] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function loadMore() {
    if (!nextCursor) return;
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (action) params.set("action", action);
        params.set("cursor", nextCursor);

        const res = await fetch(`/api/audit?${params.toString()}`);
        const data = (await res.json()) as {
          logs?: AuditLogRow[];
          nextCursor?: string | null;
          error?: string;
        };
        if (!res.ok || !data.logs) {
          throw new Error(data.error ?? "Failed to load audit logs.");
        }
        setLogs((prev) => [...prev, ...data.logs!]);
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    fetchLogsWith(value, action);
  }

  function handleActionChange(value: string) {
    setAction(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLogsWith(status, value);
    }, 350);
  }

  function fetchLogsWith(statusValue: string, actionValue: string) {
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (statusValue) params.set("status", statusValue);
        if (actionValue) params.set("action", actionValue);

        const res = await fetch(`/api/audit?${params.toString()}`);
        const data = (await res.json()) as {
          logs?: AuditLogRow[];
          nextCursor?: string | null;
          error?: string;
        };
        if (!res.ok || !data.logs) {
          throw new Error(data.error ?? "Failed to load audit logs.");
        }
        setLogs(data.logs);
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          value={action}
          onChange={(e) => handleActionChange(e.target.value)}
          placeholder="Filter by tool/action…"
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchLogsWith(status, action)}
          disabled={isPending}
          aria-label="Refresh"
          className="ml-auto"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--destructive)]">
          <ShieldAlert className="size-3.5" />
          {error}
        </p>
      )}

      {logs.length === 0 && !isPending && (
        <p className="text-sm text-[var(--muted-foreground)]">
          No audit log entries match these filters yet. Entries appear here
          whenever the Hermes agent runs a tool, requests approval, or a request
          is approved/rejected.
        </p>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="flex items-start justify-between gap-4 pt-4 pb-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[var(--foreground)]">
                    {log.action}
                  </span>
                  <Badge variant={STATUS_VARIANT[log.status] ?? "muted"}>
                    {log.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {log.user?.name ?? log.user?.email ?? "Unknown user"} ·{" "}
                  {formatDateTime(log.createdAt)}
                </p>
                {log.payload != null && (
                  <pre className="mt-1.5 max-h-32 overflow-auto rounded-md bg-[var(--muted)] p-2 text-[10px] text-[var(--muted-foreground)]">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {nextCursor && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={loadMore}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Load more
        </Button>
      )}
    </div>
  );
}
