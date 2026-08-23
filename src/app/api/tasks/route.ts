import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUSES = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDTO(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

/** GET /api/tasks?status=&priority= */
export async function GET(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const priority = req.nextUrl.searchParams.get("priority");

  const tasks = await db.task.findMany({
    where: {
      userId: user.id,
      ...(status && STATUSES.includes(status) ? { status } : {}),
      ...(priority && PRIORITIES.includes(priority) ? { priority } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ tasks: tasks.map(toDTO) });
}

/** POST /api/tasks — Body: { title, description?, priority?, dueDate? } */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let title: string;
  let description: string | undefined;
  let priority: string;
  let dueDate: Date | undefined;

  try {
    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      priority?: unknown;
      dueDate?: unknown;
    };
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new Error("'title' is required.");
    }
    title = body.title.trim();
    description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : undefined;
    priority = PRIORITIES.includes(body.priority as string)
      ? (body.priority as string)
      : "MEDIUM";
    dueDate =
      typeof body.dueDate === "string" && body.dueDate
        ? new Date(body.dueDate)
        : undefined;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const task = await db.task.create({
    data: {
      userId: user.id,
      title,
      description,
      priority: priority as never,
      dueDate,
    },
  });

  return NextResponse.json({ task: toDTO(task) }, { status: 201 });
}
