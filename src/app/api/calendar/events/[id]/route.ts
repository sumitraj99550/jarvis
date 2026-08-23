import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** PATCH /api/calendar/events/:id */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.calendarEvent.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  try {
    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      location?: unknown;
      startAt?: unknown;
      endAt?: unknown;
      allDay?: unknown;
    };
    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        throw new Error("'title' must be a non-empty string.");
      }
      data.title = body.title.trim();
    }
    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }
    if (body.location !== undefined) {
      data.location =
        typeof body.location === "string" ? body.location.trim() || null : null;
    }
    if (body.startAt !== undefined)
      data.startAt = new Date(body.startAt as string);
    if (body.endAt !== undefined) {
      data.endAt = body.endAt ? new Date(body.endAt as string) : null;
    }
    if (body.allDay !== undefined) data.allDay = body.allDay === true;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const event = await db.calendarEvent.update({ where: { id }, data });

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description ?? null,
      location: event.location ?? null,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt ? event.endAt.toISOString() : null,
      allDay: event.allDay,
    },
  });
}

/** DELETE /api/calendar/events/:id */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.calendarEvent.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  await db.calendarEvent.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
