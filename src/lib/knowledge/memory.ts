/**
 * Long-term agent memory (Phase 17) — real semantic recall, no mock layer.
 * ---------------------------------------------------------------------------
 * Distinct from KnowledgeDocument: memories are short facts the Hermes
 * agent is told to remember (via the `remember_fact` tool), retrievable by
 * meaning later (via `recall_memory`) — this is what lets JARVIS "know"
 * things across separate conversations instead of starting from zero
 * every time.
 */

import { db } from "@/lib/db";
import { embedText } from "@/lib/ai";
import { toVectorLiteral } from "./vector";

export type MemoryDTO = {
  id: string;
  content: string;
  createdAt: string;
};

export type MemorySearchResult = MemoryDTO & { similarity: number };

export async function listMemories(ownerId: string): Promise<MemoryDTO[]> {
  const rows = await db.agentMemory.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row: (typeof rows)[number]) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function rememberFact(
  ownerId: string,
  content: string,
): Promise<MemoryDTO> {
  const created = await db.agentMemory.create({ data: { ownerId, content } });

  try {
    const embedding = await embedText(content);
    const literal = toVectorLiteral(embedding);
    await db.$executeRaw`
      UPDATE agent_memories
      SET embedding = ${literal}::vector
      WHERE id = ${created.id}
    `;
  } catch {
    // Memory still exists and is listable, just won't surface in semantic
    // recall until re-embedded — don't fail the whole "remember" action
    // over an embedding hiccup.
  }

  return {
    id: created.id,
    content: created.content,
    createdAt: created.createdAt.toISOString(),
  };
}

export async function forgetMemory(ownerId: string, id: string): Promise<void> {
  const existing = await db.agentMemory.findFirst({ where: { id, ownerId } });
  if (!existing) throw new Error("Memory not found.");
  await db.agentMemory.delete({ where: { id } });
}

/** Semantic recall — same cosine-distance approach as document search. */
export async function recallMemories(
  ownerId: string,
  query: string,
  limit = 5,
): Promise<MemorySearchResult[]> {
  const queryEmbedding = await embedText(query);
  const literal = toVectorLiteral(queryEmbedding);

  const rows = await db.$queryRaw<
    Array<{ id: string; content: string; createdAt: Date; similarity: number }>
  >`
    SELECT id, content, "createdAt",
           1 - (embedding <=> ${literal}::vector) AS similarity
    FROM agent_memories
    WHERE "ownerId" = ${ownerId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${limit}
  `;

  return rows.map((row: (typeof rows)[number]) => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    similarity: row.similarity,
  }));
}
