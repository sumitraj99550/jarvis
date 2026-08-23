import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

/**
 * PATCH /api/tasks/:id
 * Body: { title?, description?, status?, priority?, dueDate? (null clears it) }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.task.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  try {
    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      status?: unknown;
      priority?: unknown;
      dueDate?: unknown;
    };
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        throw new Error("'title' must be a non-empty string.");
      }
      data.title = body.title.trim();
    }
    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status as string)) {
        throw new Error(`'status' must be one of: ${STATUSES.join(", ")}`);
      }
      data.status = body.status;
    }
    if (body.priority !== undefined) {
      if (!PRIORITIES.includes(body.priority as string)) {
        throw new Error(`'priority' must be one of: ${PRIORITIES.join(", ")}`);
      }
      data.priority = body.priority;
    }
    if (body.dueDate !== undefined) {
      data.dueDate =
        body.dueDate === null ? null : new Date(body.dueDate as string);
      // Changing the due date invalidates any reminder already sent.
      data.reminderSentAt = null;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const task = await db.task.update({ where: { id }, data });

  return NextResponse.json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    },
  });
}

/** DELETE /api/tasks/:id */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.task.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  await db.task.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
