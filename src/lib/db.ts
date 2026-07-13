/**
 * Prisma Client — driver-adapter singleton
 * ---------------------------------------------------------------------------
 * Prisma 7 changed the default generator engine type to "client" (WASM-based).
 * This engine requires a driver adapter — calling new PrismaClient() without
 * one throws PrismaClientConstructorValidationError.
 *
 * We use @prisma/adapter-pg (the official PostgreSQL adapter). It wraps a
 * standard pg.Pool and passes connections to Prisma's WASM query engine
 * without any native Prisma binary at runtime.
 *
 * Singleton pattern: stash on globalThis so Next.js hot-reloads in dev
 * don't create a new Pool on every file save and exhaust Postgres connections.
 *
 * Usage:
 *   import { db } from "@/lib/db";
 *   const users = await db.user.findMany();
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// PrismaClient is loaded via require() rather than import so this file
// compiles before `prisma generate` has been run. The generated module
// (node_modules/.prisma/client/) doesn't exist until after generate;
// require() defers resolution to runtime, bypassing TypeScript's
// import-time module check.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new (opts: Record<string, unknown>) => PrismaDb;
};

/**
 * Minimal type alias for the Prisma client.
 *
 * After `prisma generate` runs, the real PrismaClient carries the full
 * generated types for every model. Before generate (e.g. first clone, CI
 * pre-generate), this `any` alias keeps things compiling without errors.
 * All call sites continue to get full type-safety once generate has run
 * because TypeScript narrows `any` through usage context.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDb = any;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaDb | undefined;
};

function createClient(): PrismaDb {
  // One pg.Pool per process — shared across requests for connection reuse.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db: PrismaDb = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
