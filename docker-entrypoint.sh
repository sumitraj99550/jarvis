#!/bin/sh
# ---------------------------------------------------------------------------
# Runs on every container start. Applies any pending Prisma migrations
# against the REAL production DATABASE_URL (only available at runtime, not
# build time) before starting the server — `prisma migrate deploy` is the
# production-safe counterpart to `prisma migrate dev` (applies existing
# migrations, never generates new ones or prompts interactively).
# ---------------------------------------------------------------------------
set -e

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

echo "[entrypoint] starting: $@"
exec "$@"
