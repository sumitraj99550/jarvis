/**
 * Prisma Client Singleton
 * ---------------------------------------------------------------------------
 * Prevents exhausting database connections during Next.js hot-reload in dev:
 * without this guard every file save would create a new PrismaClient and
 * open a new Postgres connection pool.
 *
 * The `require()` call below is intentional: it lets TypeScript compile this
 * file before `prisma generate` has been run (the generated
 * `@prisma/client` module doesn't exist in node_modules until after
 * generate). At runtime, `prisma generate` will always have been run
 * (enforced by the `postinstall` script in package.json) so the require
 * will succeed.
 *
 * Usage throughout the app:
 *   import { db } from "@/lib/db";
 *   const users = await db.user.findMany();
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");

type PrismaClientType = InstanceType<typeof PrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

export const db: PrismaClientType =
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
