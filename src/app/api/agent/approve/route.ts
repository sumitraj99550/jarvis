import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { executeTool } from "@/lib/hermes/tools";
import type { PendingApprovalData } from "@/lib/hermes/types";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  // -------------------------------------------------------------------------
  // 1. Auth
  // -------------------------------------------------------------------------
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  // -------------------------------------------------------------------------
  // 2. Parse body
  // -------------------------------------------------------------------------
  let auditLogId: string;
  let reject = false;

  try {
    const body = (await req.json()) as {
      auditLogId?: unknown;
      reject?: unknown;
    };
    if (typeof body.auditLogId !== "string" || !body.auditLogId) {
      throw new Error("Missing auditLogId");
    }
    auditLogId = body.auditLogId;
    reject = body.reject === true;
  } catch {
    return NextResponse.json(
      { error: "Request body must include 'auditLogId' (string)." },
      { status: 400 },
    );
  }

  // -------------------------------------------------------------------------
  // 3. Load and validate the pending approval
  // -------------------------------------------------------------------------
  const auditLog = await db.auditLog.findUnique({
    where: { id: auditLogId },
  });

  if (!auditLog) {
    return NextResponse.json(
      { error: "Approval request not found." },
      { status: 404 },
    );
  }

  if (auditLog.status !== "pending_approval") {
    return NextResponse.json(
      { error: `This request has already been ${auditLog.status}.` },
      { status: 409 },
    );
  }

  // Ownership check — users can only action their own pending approvals
  if (auditLog.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const data = auditLog.payload as unknown as PendingApprovalData;

  // -------------------------------------------------------------------------
  // 4a. Reject path
  // -------------------------------------------------------------------------
  if (reject) {
    await db.auditLog.update({
      where: { id: auditLogId },
      data: { status: "rejected" },
    });

    const response = `Action cancelled. The request to "${data.toolLabel}" was rejected and will not be executed.`;

    // Save the rejection as a conversation turn so the chat history stays coherent
    await db.conversation.create({
      data: {
        userId: user.id,
        message: `[Approval requested: ${data.toolName}]`,
        response,
      },
    });

    return NextResponse.json({ rejected: true, response });
  }

  // -------------------------------------------------------------------------
  // 4b. Approve path — execute the stored tool call
  // -------------------------------------------------------------------------
  let toolResult: unknown;
  let summary: string;

  try {
    const { result, record } = await executeTool(data.toolName, data.args, {
      userId: user.id,
    });
    toolResult = result;
    summary = record.summary;
  } catch (err) {
    // Mark as failed so it can't be retried
    await db.auditLog.update({
      where: { id: auditLogId },
      data: { status: "failed" },
    });

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Tool execution failed after approval.",
      },
      { status: 500 },
    );
  }

  // Update audit log to reflect execution
  await db.auditLog.update({
    where: { id: auditLogId },
    data: {
      status: "executed",
      payload: {
        ...(data as unknown as Record<string, unknown>),
        result: toolResult,
      },
    },
  });

  const response = `Done. ${summary}`;

  // Save as a conversation turn
  await db.conversation.create({
    data: {
      userId: user.id,
      message: `[Approved: ${data.toolName}]`,
      response,
    },
  });

  return NextResponse.json({
    executed: true,
    response,
    tool: {
      name: data.toolName,
      label: data.toolLabel,
      summary,
    },
  });
}
