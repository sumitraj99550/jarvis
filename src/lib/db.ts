import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 * ---------------------------------------------------------------------------
 * In Next.js development, modules are hot-reloaded on every file save. If we
 * naively did `export const db = new PrismaClient()`, each reload would
 * create a brand-new client (and a brand-new connection pool against
 * Postgres), eventually exhausting available connections.
 *
 * The fix: stash the client on the Node.js global object, which survives
 * hot-reloads, and reuse it if it already exists. In production this code
 * path runs once per server instance, so the global is just a formality.
 *
 * Usage elsewhere in the app:
 *   import { db } from "@/lib/db";
 *   const users = await db.user.findMany();
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
