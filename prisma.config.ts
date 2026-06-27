import { defineConfig, env } from "prisma/config";
import { config as loadEnv } from "dotenv";

/**
 * Next.js conventionally reads `.env.local`, but the Prisma CLI only
 * auto-loads a plain `.env` file. To avoid maintaining two separate env
 * files for one DATABASE_URL, we explicitly load `.env.local` here before
 * defining the config.
 */
loadEnv({ path: ".env.local" });

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
