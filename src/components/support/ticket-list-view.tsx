"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketDTO,
  type TicketPriority,
} from "@/lib/support/types";

const STATUS_VARIANT: Record<
  string,
  "success" | "default" | "muted" | "destructive"
> = {
  OPEN: "default",
  PENDING: "muted",
  RESOLVED: "success",
  ESCALATED: "destructive",
};

const PRIORITY_VARIANT: Record<
  string,
  "success" | "default" | "muted" | "destructive"
> = {
  LOW: "muted",
  MEDIUM: "default",
  HIGH: "destructive",
  URGENT: "destructive",
};

export function TicketListView({
  initialTickets,
}: {
  initialTickets: TicketDTO[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function applyFilters(nextStatus: string, nextPriority: string) {
    startTransition(async () => {
      const params = new URLSearchParams();
      if (nextStatus) params.set("status", nextStatus);
      if (nextPriority) params.set("priority", nextPriority);
      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { tickets: TicketDTO[] };
        setTickets(data.tickets);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            applyFilters(e.target.value, priority);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">All statuses</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            applyFilters(status, e.target.value);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">All priorities</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <Button
          size="sm"
          className="ml-auto"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="size-4" />
          New ticket
        </Button>
      </div>

      {showForm && (
        <NewTicketForm
          onCreated={(t) => {
            setTickets((prev) => [t, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      {isPending && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <Loader2 className="size-3.5 animate-spin" /> Loading…
        </p>
      )}

      {tickets.length === 0 && !isPending && (
        <p className="text-sm text-[var(--muted-foreground)]">
          No tickets match these filters.
        </p>
      )}

      <div className="space-y-2">
        {tickets.map((t) => (
          <Link key={t.id} href={`/dashboard/support/${t.id}`}>
            <Card className="transition-colors hover:border-[var(--primary)]/30">
              <CardContent className="flex items-center justify-between gap-4 pt-4 pb-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {t.subject}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {t.customer} · {t.messageCount} message
                    {t.messageCount !== 1 ? "s" : ""}
                    {t.assignedToName
                      ? ` · assigned to ${t.assignedToName}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={PRIORITY_VARIANT[t.priority]}>
                    {t.priority}
                  </Badge>
                  <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewTicketForm({ onCreated }: { onCreated: (t: TicketDTO) => void }) {
  const [subject, setSubject] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          customer,
          customerEmail,
          priority,
          message,
        }),
      });
      const data = (await res.json()) as {
        ticket?: TicketDTO;
        error?: string;
      };
      if (!res.ok || !data.ticket) {
        throw new Error(data.error ?? "Failed to create ticket.");
      }
      onCreated(data.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const valid =
    subject.trim() &&
    customer.trim() &&
    customerEmail.includes("@") &&
    message.trim();

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer name"
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <input
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="Customer email"
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Customer's opening message…"
          rows={3}
          className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
        <Button size="sm" disabled={!valid || submitting} onClick={submit}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Create ticket
        </Button>
        {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      </CardContent>
    </Card>
  );
}
