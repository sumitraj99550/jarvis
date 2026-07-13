import { defineConfig, env } from "prisma/config";
import { config as loadEnv } from "dotenv";

/**
 * Prisma 7's config loader does NOT auto-load `.env` files once a
 * `prisma.config.ts` is present (this is a deliberate change from older
 * Prisma versions, which loaded `.env` automatically). We load it
 * ourselves here, before `defineConfig` runs, so `env("DATABASE_URL")`
 * below has something to resolve.
 *
 * This project ships a committed `.env` with safe local-dev defaults
 * (matching docker-compose.yml), so this works immediately after
 * `npm install` with no manual setup. dotenv loads `.env.local` next (if
 * present) and lets it override `.env`, matching Next.js's own precedence.
 */
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

/**
 * Prisma 7 configuration.
 * ---------------------------------------------------------------------------
 * Prisma 7 removed `datasource.url` (and a few other runtime concerns) from
 * `schema.prisma` in favor of this config file. schema.prisma is now purely
 * structural (models, enums, the datasource *provider*); anything
 * environment-dependent — the connection string, the seed command, feature
 * gates — lives here instead.
 *
 * Loaded automatically by every `prisma` CLI command (generate, migrate,
 * validate, db push, studio) run from the project root.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  experimental: {
    // Required to use the `extensions` array on the datasource block in
    // schema.prisma (we use it to enable Postgres's `vector` extension for
    // the long-term memory feature in Phase 17).
    extensions: true,
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
