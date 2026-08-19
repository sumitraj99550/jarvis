/**
 * pgvector stores vectors as text like `[0.123,0.456,...]` cast to
 * `::vector`. Prisma Client has no native vector type, so every read/write
 * touching the `embedding` column goes through `$executeRaw`/`$queryRaw`
 * with this literal format.
 */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
