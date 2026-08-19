import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { listDocuments } from "@/lib/knowledge/documents";
import { listMemories } from "@/lib/knowledge/memory";
import { KnowledgeBaseView } from "@/components/knowledge/knowledge-base-view";

export const dynamic = "force-dynamic";

const getCachedUser = cache(getCurrentDbUser);

export default async function KnowledgeBasePage() {
  const user = await getCachedUser();
  if (!user) redirect("/sign-in");

  const [documents, memories] = await Promise.all([
    listDocuments(user.id),
    listMemories(user.id),
  ]);

  const hasApiKey = Boolean(process.env.GOOGLE_AI_API_KEY);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <p className="text-xs tracking-[0.25em] text-[var(--muted-foreground)] uppercase">
            Phase 17 — Long-Term Memory &amp; Knowledge Base
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            Knowledge Base
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Documents and long-term memories, searchable by meaning — real
            semantic search via Gemini embeddings + pgvector, not keyword
            matching.
          </p>
        </div>

        {!hasApiKey && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
            GOOGLE_AI_API_KEY not set — documents/memories can still be saved,
            but embedding (and therefore search) won&apos;t work until it is.
          </p>
        )}

        <KnowledgeBaseView
          initialDocuments={documents}
          initialMemories={memories}
        />
      </div>
    </div>
  );
}
