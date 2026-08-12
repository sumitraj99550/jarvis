import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending_approval", "executed", "rejected", "failed"];

/**
 * GET /api/audit?status=&action=&cursor=
 *
 * MANAGER+ only (audit trail is sensitive — who ran what, when). Returns the
 * most recent audit log entries, optionally filtered by status or a
 * substring match on the tool/action name. This is the same `AuditLog`
 * table written by /api/agent (tool_start/pending_approval) and
 * /api/agent/approve (approve/reject) since Phase 8 — this route is the
 * first UI-facing consumer of that data.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("MANAGER");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forbidden." },
      { status: 403 },
    );
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam ?? "")
    ? (statusParam as string)
    : undefined;
  const action = req.nextUrl.searchParams.get("action") ?? undefined;
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

  const logs = await db.auditLog.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(action ? { action: { contains: action } } : {}),
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const nextCursor = logs.length === 50 ? logs[logs.length - 1]!.id : null;

  return NextResponse.json({ logs, nextCursor });
}
