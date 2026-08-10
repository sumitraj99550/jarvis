import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getBufferService } from "@/lib/buffer";

export const dynamic = "force-dynamic";

/** GET /api/social/posts/:id */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;
  const post = await getBufferService().getPost(user.id, id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ post });
}

/**
 * PATCH /api/social/posts/:id
 * Body: { content?: string, scheduledFor?: string | null }
 * Edits a draft or scheduled post. Published posts can't be edited.
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

  let content: string | undefined;
  let scheduledFor: string | null | undefined;

  try {
    const body = (await req.json()) as {
      content?: unknown;
      scheduledFor?: unknown;
    };
    if (body.content !== undefined) {
      if (typeof body.content !== "string" || !body.content.trim()) {
        throw new Error("'content' must be a non-empty string.");
      }
      content = body.content.trim();
    }
    if (body.scheduledFor !== undefined) {
      scheduledFor =
        body.scheduledFor === null ? null : String(body.scheduledFor);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const post = await getBufferService().updatePost(user.id, id, {
      content,
      scheduledFor,
    });
    return NextResponse.json({ post });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update post." },
      { status: 400 },
    );
  }
}

/** DELETE /api/social/posts/:id */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await getBufferService().deletePost(user.id, id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete post." },
      { status: 404 },
    );
  }
}
