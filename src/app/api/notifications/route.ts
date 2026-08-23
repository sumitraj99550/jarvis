import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/notifications — most recent 20 + unread count. */
export async function GET() {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return NextResponse.json({
    notifications: notifications.map((n: (typeof notifications)[number]) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
}
