# Deployment Guide (Phase 20)

This covers taking JARVIS from local development to a real deployment. Read this alongside [`README.md`](./README.md) (setup) and [`PROGRESS.md`](./PROGRESS.md) (what's actually built).

## Why this isn't a one-click deploy

JARVIS has a **background worker** (Phase 9) that runs continuously — it's not a request/response HTTP handler, so it can't run on pure serverless platforms (plain Vercel, Netlify Functions, Cloudflare Workers). Without it, background jobs silently stop working: no heartbeat, no scheduled daily briefing, no task-due-date reminders, no queued job of any kind. This is the single biggest thing to get right when picking where to deploy.

Two supported paths:

## Option A — Docker self-host (recommended, simplest)

Everything (app, worker, Postgres, Redis) in one `docker-compose.prod.yml`, on any host that runs Docker: a VPS (DigitalOcean, Hetzner, Linode), a dedicated server, or a container platform (Railway, Render, Fly.io all support docker-compose-style multi-service deployments).

```bash
# 1. On your server, clone/copy the project, then:
cp .env.production.example .env.production
# Edit .env.production with real values — see the file's own comments.
# Critically: DATABASE_URL and REDIS_URL use the Docker service names
# ("postgres", "redis"), NOT "localhost" — docker-compose.prod.yml's
# internal network resolves those names automatically.

# 2. Build and start everything
npm run docker:build
npm run docker:up

# 3. Check it's healthy
curl http://localhost:3000/api/health
# {"status":"healthy","checks":{"database":true,"redis":true},...}

# 4. Watch logs
npm run docker:logs
```

**Put a reverse proxy with TLS in front of port 3000** — docker-compose.prod.yml doesn't set up HTTPS itself. Caddy is the simplest option (automatic Let's Encrypt certs):

```
# Caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

Or use nginx + certbot, or your platform's built-in TLS termination if using Railway/Render/Fly.

### Migrations in this setup

`docker-entrypoint.sh` runs `prisma migrate deploy` automatically every time the `app` container starts, against the real production database. This is safe to run repeatedly — it only applies migrations that haven't been applied yet, never regenerates or prompts. You never need to run migrations manually in this setup.

## Option B — Split deployment (app on a serverless platform, worker elsewhere)

If you want the app on Vercel (or similar) for its edge network/CDN benefits, the worker needs to run somewhere that supports long-running processes:

- **App** → Vercel: connect the repo, set the same env vars as `.env.production.example` (minus `POSTGRES_*`, which Vercel doesn't need) in Vercel's dashboard. Vercel builds with `next build` automatically — no Docker needed for this half.
- **Worker** → Railway, Render, or Fly.io (all support a plain "run this Docker image continuously" service): build and push `Dockerfile.worker`, point it at the same `DATABASE_URL`/`REDIS_URL` as the app (a managed Postgres + Redis — e.g. Neon/Supabase for Postgres with pgvector support, Upstash for Redis).
- **Migrations**: run manually once per deploy: `DATABASE_URL=<prod-url> npx prisma migrate deploy` from your machine or a CI step, since there's no shared entrypoint script across two separate platforms.

This is more moving parts — only worth it if you specifically need Vercel's edge features. Option A is simpler to operate and reason about.

## Required managed services either way

| Service | Needs | Notes |
|---|---|---|
| Postgres | pgvector extension (Phase 17) | Self-hosted: `pgvector/pgvector:pg16` image (already in both compose files). Managed: Neon, Supabase, or any Postgres that supports installing the `vector` extension — plain RDS/Cloud SQL without pgvector won't work for Knowledge Base/Memory search. |
| Redis | Any Redis 6+ | Self-hosted: `redis:7-alpine` (already in both compose files). Managed: Upstash, Redis Cloud. |
| Clerk | Production instance | Switch from `pk_test_`/`sk_test_` to `pk_live_`/`sk_live_` keys, and re-point the webhook URL to your real domain. |

## Content-Security-Policy

Off by default (`ENABLE_CSP=false` in `.env.production.example`). Once deployed to your real domain:

1. Set `ENABLE_CSP=true`.
2. Redeploy.
3. **Manually verify these still work** before considering it done: sign-in/sign-up (Clerk's hosted UI), Command Center's streaming chat, and — if you use them — the voice features (Phases 15/16, which use the browser's own Web Speech APIs and shouldn't be affected by CSP, but verify anyway).
4. If something breaks, check the browser console for CSP violation messages — they name exactly which directive blocked what, so you can extend the specific `*-src` list in `next.config.mjs` rather than disabling CSP wholesale.

## Health checks

`GET /api/health` — no auth required (load balancers/uptime monitors can't authenticate). Checks a real database query; Redis is checked but doesn't fail the health check on its own (background jobs already degrade gracefully without Redis — see Phase 9). Returns `200` + `{"status":"healthy"}` or `503` + `{"status":"unhealthy"}`.

Both `docker-compose.prod.yml` and the app's own `Dockerfile` already wire this into Docker's `HEALTHCHECK` — `docker ps` will show `(healthy)`/`(unhealthy)` directly.

## What Phase 20 does NOT include

Being upfront about the boundary, per this project's "no fake completion" rule:

- **No CI/CD pipeline** (GitHub Actions, etc.) is set up — this is manual `docker compose up` deployment, not push-to-deploy.
- **No actual live deployment exists** — everything above is verified to build correctly (`npm run build` succeeds with `output: "standalone"`, the Dockerfiles are syntactically correct multi-stage builds), but has not been deployed to and tested against a real running server, since this project has no hosting account or domain to deploy to. **Test the full flow yourself** on your chosen platform before relying on it.
- **No log aggregation / APM** (Sentry, Datadog, etc.) — `SENTRY_DSN` is a reserved env var in the template but nothing reads it yet.
- **No automated backups** for the Postgres volume — set those up on whatever host you choose (most managed Postgres providers include this; self-hosted Docker volumes need your own backup cron).
