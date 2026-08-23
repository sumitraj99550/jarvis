"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EventDTO = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 16);
}

export function CalendarView() {
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetches this month's events whenever the visible month changes.
  // This is the textbook "fetch data in an effect" case React's own docs
  // describe as legitimate (https://react.dev/learn/you-might-not-need-an-effect#fetching-data) —
  // synchronizing with the server, not deriving state from other state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const from = startOfMonth(monthAnchor);
    const to = endOfMonth(monthAnchor);
    fetch(
      `/api/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`,
    )
      .then((r) => r.json())
      .then((data: { events?: EventDTO[] }) => setEvents(data.events ?? []))
      .finally(() => setLoading(false));
  }, [monthAnchor]);

  const first = startOfMonth(monthAnchor);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const days: Date[] = [];
  for (
    let d = new Date(gridStart);
    days.length < 42;
    d = new Date(d.getTime() + DAY_MS)
  ) {
    days.push(new Date(d));
  }

  function eventsOn(day: Date) {
    return events.filter((e) => sameDay(new Date(e.startAt), day));
  }

  function openNewEvent(day: Date) {
    setSelectedDay(day);
    const dt = new Date(day);
    dt.setHours(9, 0, 0, 0);
    setStartAt(toDateInputValue(dt));
    setTitle("");
    setAllDay(false);
    setShowForm(true);
    setError(null);
  }

  async function createEvent() {
    if (!title.trim() || !startAt) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startAt: new Date(startAt).toISOString(),
          allDay,
        }),
      });
      const data = (await res.json()) as { event?: EventDTO; error?: string };
      if (!res.ok || !data.event)
        throw new Error(data.error ?? "Failed to create event.");
      setEvents((prev) => [...prev, data.event as EventDTO]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    const res = await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  const today = new Date();
  const selectedEvents = selectedDay ? eventsOn(selectedDay) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setMonthAnchor(
                (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
              )
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="w-40 text-center text-sm font-medium text-[var(--foreground)]">
            {monthAnchor.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setMonthAnchor(
                (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
              )
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMonthAnchor(new Date())}
        >
          Today
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-lg">
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[10px] font-medium text-[var(--muted-foreground)]"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = day.getMonth() === monthAnchor.getMonth();
              const dayEvents = eventsOn(day);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() =>
                    dayEvents.length ? setSelectedDay(day) : openNewEvent(day)
                  }
                  className={`flex min-h-20 flex-col items-start gap-1 border-r border-b border-[var(--border)] p-1.5 text-left transition-colors last:border-r-0 hover:bg-[var(--secondary)]/20 ${
                    inMonth ? "" : "opacity-30"
                  }`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                      isToday
                        ? "bg-[var(--primary)] text-[var(--background)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayEvents.slice(0, 2).map((e) => (
                    <span
                      key={e.id}
                      className="w-full truncate rounded bg-[var(--primary)]/15 px-1 text-[9px] text-[var(--primary)]"
                    >
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-[var(--muted-foreground)]">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDay && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {selectedDay.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openNewEvent(selectedDay)}
              >
                <Plus className="size-3.5" />
                Add event
              </Button>
            </div>
            {selectedEvents.length === 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">
                No events.
              </p>
            )}
            {selectedEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
              >
                <div>
                  <p className="text-xs text-[var(--foreground)]">{e.title}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {e.allDay
                      ? "All day"
                      : new Date(e.startAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteEvent(e.id)}
                >
                  <Trash2 className="size-3.5 text-[var(--muted-foreground)]" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
              <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                All day
              </label>
              <Button
                size="sm"
                className="ml-auto"
                disabled={saving || !title.trim()}
                onClick={createEvent}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Save event
              </Button>
            </div>
            {error && (
              <p className="text-xs text-[var(--destructive)]">{error}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
