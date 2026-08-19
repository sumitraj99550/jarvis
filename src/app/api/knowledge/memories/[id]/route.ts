import { NextResponse } from "next/server";
import { getCurrentDbUser } from "@/lib/auth";
import { forgetMemory } from "@/lib/knowledge/memory";

export const dynamic = "force-dynamic";

/** DELETE /api/knowledge/memories/:id */
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
    await forgetMemory(user.id, id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Not found." },
      { status: 404 },
    );
  }
}
