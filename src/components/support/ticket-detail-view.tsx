"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketDTO,
  type TicketMessageDTO,
  type TicketPriority,
  type TicketStatus,
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

export function TicketDetailView({
  initialTicket,
  initialMessages,
}: {
  initialTicket: TicketDTO;
  initialMessages: TicketMessageDTO[];
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState(initialMessages);
  const [reply, setReply] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function generateDraft() {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/draft`, {
        method: "POST",
      });
      const data = (await res.json()) as { draft?: string; error?: string };
      if (!res.ok || !data.draft) {
        throw new Error(data.error ?? "Failed to generate a draft.");
      }
      setReply(data.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDrafting(false);
    }
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      });
      const data = (await res.json()) as {
        message?: TicketMessageDTO;
        error?: string;
      };
      if (!res.ok || !data.message) {
        throw new Error(data.error ?? "Failed to send reply.");
      }
      setMessages((prev) => [...prev, data.message as TicketMessageDTO]);
      setReply("");
      if (ticket.status === "OPEN") {
        setTicket((prev) => ({ ...prev, status: "PENDING" }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function updateStatus(patch: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignToMe?: boolean;
  }) {
    startTransition(async () => {
      const res = await fetch(`/api/support/tickets/${ticket.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = (await res.json()) as { ticket: Partial<TicketDTO> };
        setTicket((prev) => ({ ...prev, ...data.ticket }));
      }
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/support"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-3.5" />
        Back to Support Center
      </Link>

      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            {ticket.subject}
          </h2>
          <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          {ticket.customer} · {ticket.customerEmail}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={ticket.status}
          onChange={(e) =>
            updateStatus({ status: e.target.value as TicketStatus })
          }
          disabled={isPending}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={ticket.priority}
          onChange={(e) =>
            updateStatus({ priority: e.target.value as TicketPriority })
          }
          disabled={isPending}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => updateStatus({ assignToMe: true })}
        >
          <UserPlus className="size-3.5" />
          {ticket.assignedToName
            ? `Assigned: ${ticket.assignedToName}`
            : "Assign to me"}
        </Button>
      </div>

      {/* Thread */}
      <div className="space-y-3">
        {messages.map((m) => (
          <Card
            key={m.id}
            className={
              m.author === "CUSTOMER" ? undefined : "border-[var(--primary)]/20"
            }
          >
            <CardContent className="pt-4 pb-4">
              <p className="mb-1 text-[11px] font-medium tracking-wide text-[var(--muted-foreground)] uppercase">
                {m.author === "CUSTOMER" ? ticket.customer : "Agent"}
              </p>
              <p className="text-sm whitespace-pre-wrap text-[var(--foreground)]">
                {m.content}
              </p>
              <p className="mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                {new Date(m.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reply composer */}
      <Card>
        <CardContent className="space-y-3 pt-6">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply, or generate an AI draft…"
            rows={5}
            className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateDraft}
              disabled={drafting}
            >
              {drafting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate AI draft
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              onClick={sendReply}
              disabled={sending || !reply.trim()}
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send reply
            </Button>
          </div>
          {error && (
            <p className="text-xs text-[var(--destructive)]">{error}</p>
          )}
          <p className="text-[11px] text-[var(--muted-foreground)]">
            AI drafts are generated by Gemini and always require review before
            sending — nothing is sent automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
