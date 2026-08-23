"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";

type NotificationDTO = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationDTO[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silent — the bell just won't update this cycle, not worth
      // interrupting the user with an error for a background poll.
    }
  }

  // Polls for new notifications — a genuine subscription to an external
  // system (the server), same category as React's own "fetch data in an
  // effect" guidance, not a derived-state calculation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    }
  }

  async function markOneRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "POST" });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative rounded-md p-1.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]/40 hover:text-[var(--foreground)]"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[var(--primary)] text-[8px] font-semibold text-[var(--background)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-9 right-0 z-20 w-80 rounded-lg border border-[var(--glass-border)] bg-[var(--card)] shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <p className="text-xs font-medium text-[var(--foreground)]">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] text-[var(--primary)] hover:underline"
              >
                <Check className="size-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin text-[var(--muted-foreground)]" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-[var(--muted-foreground)]">
                No notifications yet.
              </p>
            )}

            {!loading &&
              notifications.map((n) => {
                const body = (
                  <div
                    className={`border-b border-[var(--border)] px-3 py-2.5 last:border-0 ${
                      n.read ? "" : "bg-[var(--primary)]/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-[var(--foreground)]">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                      )}
                    </div>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--muted-foreground)]">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                );

                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      if (!n.read) markOneRead(n.id);
                      setOpen(false);
                    }}
                    className="block hover:bg-[var(--secondary)]/30"
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    key={n.id}
                    onClick={() => !n.read && markOneRead(n.id)}
                    className="block w-full text-left hover:bg-[var(--secondary)]/30"
                  >
                    {body}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
