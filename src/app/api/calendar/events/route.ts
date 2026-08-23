import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDTO(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    location: row.location ?? null,
    startAt: new Date(row.startAt).toISOString(),
    endAt: row.endAt ? new Date(row.endAt).toISOString() : null,
    allDay: row.allDay,
  };
}

/** GET /api/calendar/events?from=&to= — events within a date range. */
export async function GET(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const events = await db.calendarEvent.findMany({
    where: {
      userId: user.id,
      ...(from && to
        ? { startAt: { gte: new Date(from), lte: new Date(to) } }
        : {}),
    },
    orderBy: { startAt: "asc" },
    take: 500,
  });

  return NextResponse.json({ events: events.map(toDTO) });
}

/**
 * POST /api/calendar/events
 * Body: { title, description?, location?, startAt, endAt?, allDay? }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  let title: string;
  let description: string | undefined;
  let location: string | undefined;
  let startAt: Date;
  let endAt: Date | undefined;
  let allDay = false;

  try {
    const body = (await req.json()) as {
      title?: unknown;
      description?: unknown;
      location?: unknown;
      startAt?: unknown;
      endAt?: unknown;
      allDay?: unknown;
    };
    if (typeof body.title !== "string" || !body.title.trim()) {
      throw new Error("'title' is required.");
    }
    if (typeof body.startAt !== "string" || !body.startAt) {
      throw new Error("'startAt' is required.");
    }
    title = body.title.trim();
    description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : undefined;
    location =
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : undefined;
    startAt = new Date(body.startAt);
    endAt =
      typeof body.endAt === "string" && body.endAt
        ? new Date(body.endAt)
        : undefined;
    allDay = body.allDay === true;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  const event = await db.calendarEvent.create({
    data: {
      userId: user.id,
      title,
      description,
      location,
      startAt,
      endAt,
      allDay,
    },
  });

  return NextResponse.json({ event: toDTO(event) }, { status: 201 });
}
