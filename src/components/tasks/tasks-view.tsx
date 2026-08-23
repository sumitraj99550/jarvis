"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const PRIORITY_VARIANT: Record<
  string,
  "success" | "default" | "muted" | "destructive"
> = {
  LOW: "muted",
  MEDIUM: "default",
  HIGH: "destructive",
  URGENT: "destructive",
};

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "DONE" || status === "CANCELLED") return false;
  return new Date(dueDate) < new Date();
}

export function TasksView({ initialTasks }: { initialTasks: TaskDTO[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function filterByStatus(value: string) {
    setStatusFilter(value);
    startTransition(async () => {
      const params = new URLSearchParams();
      if (value) params.set("status", value);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { tasks: TaskDTO[] };
        setTasks(data.tasks);
      }
    });
  }

  function createTask() {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            priority,
            dueDate: dueDate || undefined,
          }),
        });
        const data = (await res.json()) as { task?: TaskDTO; error?: string };
        if (!res.ok || !data.task) {
          throw new Error(data.error ?? "Failed to create task.");
        }
        setTasks((prev) => [data.task as TaskDTO, ...prev]);
        setTitle("");
        setDescription("");
        setDueDate("");
        setPriority("MEDIUM");
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function updateStatus(id: string, status: string) {
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = (await res.json()) as { task: TaskDTO };
        setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)));
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => filterByStatus(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="size-4" />
          New task
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
              <Button
                size="sm"
                className="ml-auto"
                disabled={isPending || !title.trim()}
                onClick={createTask}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Create
              </Button>
            </div>
            {error && (
              <p className="text-xs text-[var(--destructive)]">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">No tasks yet.</p>
      )}

      <div className="space-y-2">
        {tasks.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-start justify-between gap-4 pt-4 pb-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-medium ${
                      t.status === "DONE"
                        ? "text-[var(--muted-foreground)] line-through"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    {t.title}
                  </p>
                  <Badge variant={PRIORITY_VARIANT[t.priority]}>
                    {t.priority}
                  </Badge>
                  {isOverdue(t.dueDate, t.status) && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t.description}
                  </p>
                )}
                {t.dueDate && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                    <CalendarIcon className="size-3" />
                    Due {formatDate(t.dueDate)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={t.status}
                  onChange={(e) => updateStatus(t.id, e.target.value)}
                  disabled={isPending}
                  className="rounded-md border border-[var(--border)] bg-[var(--input)] px-2 py-1 text-xs text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(t.id)}
                  disabled={isPending}
                >
                  <Trash2 className="size-4 text-[var(--muted-foreground)]" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
