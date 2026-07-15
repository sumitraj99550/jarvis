import { cache } from "react";
import { redirect } from "next/navigation";
import { Terminal } from "lucide-react";
import { getCurrentDbUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CommandCenter } from "@/components/command/command-center";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Command Center | JARVIS",
};

const getCachedUser = cache(getCurrentDbUser);

/** Load the 20 most-recent conversation turns for this user */
async function getConversationHistory(userId: string) {
  const rows = await db.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 40, // 20 turns × 2 messages each
  });

  // Flatten each DB row (message + response) into the ChatMessage shape
  return rows.flatMap(
    (row: {
      id: string;
      message: string;
      response: string | null;
      createdAt: Date;
    }) => [
      {
        id: `${row.id}-user`,
        role: "user" as const,
        content: row.message,
        createdAt: row.createdAt.toISOString(),
      },
      ...(row.response
        ? [
            {
              id: `${row.id}-assistant`,
              role: "assistant" as const,
              content: row.response,
              createdAt: row.createdAt.toISOString(),
            },
          ]
        : []),
    ],
  );
}

export default async function CommandPage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const initialMessages = await getConversationHistory(user.id);
  const hasApiKey = Boolean(process.env.GOOGLE_AI_API_KEY);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--glass-border)] bg-[var(--background)]/60 px-6 py-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-[var(--primary)]/10">
          <Terminal className="text-neon size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Command Center
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Natural language interface · Model: gemini-2.0-flash (free)
          </p>
        </div>
        {/* API key warning */}
        {!hasApiKey && (
          <span className="ml-auto rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
            GOOGLE_AI_API_KEY not set
          </span>
        )}
      </div>

      {/* Chat UI — client component */}
      <CommandCenter
        initialMessages={initialMessages}
        userName={user.name ?? user.email.split("@")[0]}
        hasApiKey={hasApiKey}
      />
    </div>
  );
}
