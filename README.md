# JARVIS — AI Operating System

A full-stack AI Operating System built incrementally across 20 phases. Currently through **Phase 17 of 20**.

See [`PROGRESS.md`](./PROGRESS.md) for the authoritative, continuously-updated log of what's done, what's stubbed, and what's left — read that first if you're picking this project back up after a break.

## Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, hand-built shadcn/ui-style components, Framer Motion
- **Auth**: Clerk v6, with RBAC (ADMIN/MANAGER/SUPPORT/VIEWER)
- **Database**: PostgreSQL 16 (Docker), Prisma 7 (driver-adapter mode via `@prisma/adapter-pg`)
- **Queue**: BullMQ + Redis (Docker), separate worker process
- **AI**: Google Gemini (`gemini-3.5-flash`), free tier — powers Command Center, the Hermes agent, Support Center AI drafts, and Daily Briefings
- **Package manager**: npm

## Prerequisites

- Node.js 22+
- Docker (for local Postgres + Redis)
- A free [Clerk](https://clerk.com) account
- A free [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)

## Setup (first time)

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
npm install

# 2. Start local Postgres + Redis
docker compose up -d
# Postgres image includes the pgvector extension as of Phase 17 (needed for
# Knowledge Base / long-term memory semantic search). If you set this project
# up before Phase 17, run: docker compose down && docker compose up -d
# to pick up the new image.

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local and fill in:
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY  (dashboard.clerk.com)
#   GOOGLE_AI_API_KEY                                    (aistudio.google.com/apikey)
# See .env.example for the full list, including optional MCP integration keys.

# 4. Run database migrations (creates all tables)
npx prisma migrate dev

# 5. (Optional) seed a local admin user
npm run db:seed

# 6. Start the app
npm run dev

# 7. In a SECOND terminal, start the background worker (Phase 9+)
#    Required for: heartbeat, daily-briefing cron, and any queued job.
npm run worker
```

Open http://localhost:3000 — you'll be redirected to sign in. **The first account you create automatically becomes ADMIN.**

## Every time you pull a new phase ZIP

1. Extract and overwrite your existing project folder.
2. `npm install` (picks up any new dependencies).
3. `npx prisma migrate dev` (applies any schema changes — **always check `PROGRESS.md` for whether the phase you just pulled changed the schema**).
4. Restart `npm run dev` and `npm run worker` if they were already running.

## Clerk Setup (Phase 3)

1. Create an app at https://dashboard.clerk.com
2. Copy **Publishable Key** and **Secret Key** into `.env.local`
3. Clerk Dashboard → Webhooks → Add Endpoint:
   - URL: `https://your-domain.com/api/webhooks/clerk` (use [ngrok](https://ngrok.com) or the [Clerk CLI](https://clerk.com/docs/integrations/webhooks/testing) for local testing)
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret → `CLERK_WEBHOOK_SECRET`
4. First user to register → `ADMIN`. Everyone after → `VIEWER`. Promote users in Clerk Dashboard → Users → `publicMetadata: { "role": "MANAGER" }`.

## AI Engine Setup (Phase 5+)

1. Go to https://aistudio.google.com/apikey — no credit card required.
2. Copy the key into `GOOGLE_AI_API_KEY` in `.env.local`.
3. Free tier limits: 15 requests/min, 1,500 requests/day — plenty for local dev.

Without this key set, Command Center, the Hermes agent, Support Center's "Generate AI draft," and Daily Briefings' narrative summary will all show a clear "not configured" state rather than failing silently.

## Optional: MCP Integrations (Phases 10–12)

Buffer (social), RevenueCat (revenue), and Meta Ads all require **paid or business-verified** third-party accounts to get real API access. Rather than blocking on that, each of these phases ships as a **full mock service layer** — every feature (drafts, scheduling, subscribers, campaigns, audiences, analytics) works end-to-end against realistic local mock data, with zero configuration needed.

If/when you get real credentials for any of them, set the matching env var and that module automatically switches from mock to real — no code changes required:

| Phase | Module | Env var | Real service file (currently a stub) |
|---|---|---|---|
| 10 | Social Media | `BUFFER_ACCESS_TOKEN` | `src/lib/buffer/real-service.ts` |
| 11 | Revenue | `REVENUECAT_API_KEY` | `src/lib/revenuecat/real-service.ts` |
| 12 | Meta Ads | `META_ADS_ACCESS_TOKEN` | `src/lib/metaads/real-service.ts` |

## Available Scripts

```bash
npm run dev              # Start dev server (Next.js, Turbopack)
npm run worker           # Start the background worker (BullMQ, one-shot)
npm run worker:dev       # Background worker with auto-restart on file change
npm run build             # Production build
npm run lint               # ESLint (must be zero errors before any delivery)
npm run format             # Prettier — write
npm run format:check       # Prettier — check only

npx prisma migrate dev     # Apply pending schema migrations
npx prisma studio          # Open Prisma Studio (DB GUI)
npm run db:seed            # Seed local dev data
```

## Project Structure

```
jarvis/
├── PROGRESS.md                    # ← Read this first. Live status of every phase.
├── README.md                      # This file — setup & reference
├── docker-compose.yml             # Local Postgres + Redis
├── .env / .env.example            # Environment variables (see above)
├── prisma/
│   ├── schema.prisma               # Full DB schema, all phases
│   └── seed.ts
├── prisma.config.ts                # Prisma 7 config (datasource URL, migrations)
├── next.config.mjs                 # serverExternalPackages for native-module deps
└── src/
    ├── proxy.ts                    # Clerk middleware (Next.js 16 convention)
    ├── worker/                     # Background job worker (separate process)
    │   ├── index.ts
    │   └── processors/              # heartbeat, daily-briefing, sync-user
    ├── hooks/
    │   └── use-sidebar.ts
    ├── lib/
    │   ├── db.ts                    # Prisma singleton (driver adapter)
    │   ├── auth.ts                  # getCurrentDbUser, requireRole, hasRole
    │   ├── ai.ts                    # Gemini client (sendMessage, streamMessage)
    │   ├── navigation.ts             # Sidebar config — phase badges, locked items
    │   ├── queue/                    # BullMQ queue + job registry (Phase 9)
    │   ├── hermes/                   # Agent orchestration, tools, risk/approval gate
    │   ├── buffer/                   # Social media service layer (mock + real)
    │   ├── revenuecat/               # Revenue service layer (mock + real)
    │   ├── metaads/                  # Meta Ads service layer (mock + real)
    │   ├── support/                  # AI draft-reply generation (real Gemini)
    │   └── briefing/                 # Daily briefing generator (real data + Gemini)
    ├── components/
    │   ├── ui/                       # Button, Card, Badge, etc.
    │   ├── layout/                   # Shell, Sidebar, TopNav
    │   ├── command/                  # Command Center chat + approval UI
    │   ├── social/, revenue/, ads/   # Per-module dashboards (tabbed)
    │   ├── support/, audit/, briefings/
    └── app/
        ├── (auth)/                   # Sign-in / sign-up
        ├── (dashboard)/dashboard/    # All protected pages — one folder per module
        └── api/                      # One route folder per module, mirrors lib/
```

## Design System

Dark, glass-panel, neon-blue "JARVIS" aesthetic. Tokens live in `src/app/globals.css` as CSS variables (`--primary`, `--glass-bg`, `--glow-primary`, etc.) — use `text-[var(--foreground)]` etc. rather than hardcoded Tailwind colors so everything stays on-theme.

## Known Environment Constraints

- **Sandboxed build environments** (like the one used to build/verify each phase ZIP) can't reach `binaries.prisma.sh`, so `prisma generate` can't download the real query engine there. A build-time-only stub client exists for that case — **your own machine has real internet access, so `npm install`'s `postinstall` runs the real `prisma generate` successfully and this doesn't affect you.**
- Every phase ZIP is verified with `npx tsc --noEmit`, `npm run lint`, and `npm run build` before delivery — but **not** with a live Postgres/Redis/Clerk/Gemini connection, since those aren't available in the build sandbox. Always smoke-test locally after extracting.
