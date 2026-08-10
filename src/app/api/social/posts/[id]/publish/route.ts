import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { getBufferService } from "@/lib/buffer";

export const dynamic = "force-dynamic";

/** POST /api/social/posts/:id/publish — publishes a draft/scheduled post now. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentDbUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await getBufferService().publishPost(user.id, id);
    return NextResponse.json({ post });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to publish post.",
      },
      { status: 502 },
    );
  }
}
