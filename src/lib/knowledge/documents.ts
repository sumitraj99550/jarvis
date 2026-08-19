/**
 * Knowledge Base (Phase 17) — real semantic search, no mock layer.
 * ---------------------------------------------------------------------------
 * Documents are created immediately (readable right away), then embedded
 * via Gemini's free embedding endpoint in the same request — if embedding
 * fails (e.g. missing API key), the document still exists, just without
 * `embedding` set, and search silently skips it rather than the whole
 * feature failing.
 */

import { db } from "@/lib/db";
import { embedText } from "@/lib/ai";
import { toVectorLiteral } from "./vector";

export type KnowledgeDocumentDTO = {
  id: string;
  title: string;
  content: string;
  hasEmbedding: boolean;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSearchResult = KnowledgeDocumentDTO & {
  similarity: number;
};

export async function listDocuments(
  ownerId: string,
): Promise<KnowledgeDocumentDTO[]> {
  const rows = await db.knowledgeDocument.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  // embedding is an Unsupported type — Prisma won't select it by default
  // in a typed query, so `hasEmbedding` needs a raw check instead.
  const ids = rows.map((r: (typeof rows)[number]) => r.id);
  const embedded = ids.length
    ? await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM knowledge_documents
        WHERE id = ANY(${ids}) AND embedding IS NOT NULL
      `
    : [];
  const embeddedSet = new Set(embedded.map((e: { id: string }) => e.id));

  return rows.map((row: (typeof rows)[number]) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    hasEmbedding: embeddedSet.has(row.id),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createDocument(
  ownerId: string,
  title: string,
  content: string,
): Promise<{ document: KnowledgeDocumentDTO; embeddingError: string | null }> {
  const created = await db.knowledgeDocument.create({
    data: { ownerId, title, content },
  });

  let embeddingError: string | null = null;
  try {
    const embedding = await embedText(`${title}\n\n${content}`);
    const literal = toVectorLiteral(embedding);
    await db.$executeRaw`
      UPDATE knowledge_documents
      SET embedding = ${literal}::vector
      WHERE id = ${created.id}
    `;
  } catch (err) {
    embeddingError =
      err instanceof Error ? err.message : "Failed to generate embedding.";
  }

  return {
    document: {
      id: created.id,
      title: created.title,
      content: created.content,
      hasEmbedding: embeddingError === null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    embeddingError,
  };
}

export async function deleteDocument(
  ownerId: string,
  id: string,
): Promise<void> {
  const existing = await db.knowledgeDocument.findFirst({
    where: { id, ownerId },
  });
  if (!existing) throw new Error("Document not found.");
  await db.knowledgeDocument.delete({ where: { id } });
}

/**
 * Semantic search — embeds the query, then finds the closest documents by
 * cosine distance (`<=>` is pgvector's cosine-distance operator; smaller
 * is closer). `1 - distance` is reported as a 0-1 "similarity" for the UI.
 */
export async function searchDocuments(
  ownerId: string,
  query: string,
  limit = 5,
): Promise<KnowledgeSearchResult[]> {
  const queryEmbedding = await embedText(query);
  const literal = toVectorLiteral(queryEmbedding);

  const rows = await db.$queryRaw<
    Array<{
      id: string;
      title: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      similarity: number;
    }>
  >`
    SELECT id, title, content, "createdAt", "updatedAt",
           1 - (embedding <=> ${literal}::vector) AS similarity
    FROM knowledge_documents
    WHERE "ownerId" = ${ownerId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${limit}
  `;

  return rows.map((row: (typeof rows)[number]) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    hasEmbedding: true,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    similarity: row.similarity,
  }));
}
