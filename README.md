# JARVIS — AI Operating System

A production-quality AI Operating System dashboard built incrementally over 20 phases.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Auth**: Clerk (Phase 3)
- **Database**: PostgreSQL + Prisma 7 ORM
- **AI**: OpenAI + Anthropic (Phase 7+)

## Getting Started

### Prerequisites
- Node.js 18+
- Docker (for local Postgres + Redis)
- A [Clerk](https://clerk.com) account (free tier works)

### Setup

```bash
# 1. Install dependencies (also runs prisma generate)
npm install

# 2. Start local database
docker compose up -d

# 3. Configure environment
cp .env .env.local
# Edit .env.local and fill in your Clerk keys:
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
#   CLERK_SECRET_KEY=sk_test_...

# 4. Run database migration (adds all tables)
npx prisma migrate dev

# 5. (Optional) Seed a local admin user
npm run db:seed

# 6. Start development server
npm run dev
```

Open http://localhost:3000 — you'll be redirected to sign in.

## Clerk Setup (Phase 3)

1. Create an app at https://dashboard.clerk.com
2. Copy **Publishable Key** and **Secret Key** into `.env.local`
3. In Clerk Dashboard → Webhooks → Add Endpoint:
   - URL: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret → `CLERK_WEBHOOK_SECRET` in `.env.local`
4. For local webhook testing, use [Clerk CLI](https://clerk.com/docs/integrations/webhooks/testing)

**First user to register automatically becomes ADMIN.**
Subsequent users get VIEWER role. Promote users in Clerk Dashboard → Users → `publicMetadata: { "role": "MANAGER" }`.

## Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier
npx prisma migrate dev    # Run pending migrations
npx prisma studio         # Open Prisma Studio (DB GUI)
npm run db:seed           # Seed local dev data
```

## Project Structure

```
src/
  proxy.ts                         # Clerk auth middleware (Next.js 16)
  app/
    layout.tsx                     # Root layout — ClerkProvider
    page.tsx                       # Root redirect (/ → /dashboard or /sign-in)
    (auth)/                        # Public auth pages
      layout.tsx
      sign-in/[[...sign-in]]/
      sign-up/[[...sign-up]]/
    (dashboard)/                   # Protected app pages
      layout.tsx                   # Auth guard + DB user sync
      dashboard/page.tsx           # Dashboard home (/dashboard)
    api/
      webhooks/clerk/route.ts      # Clerk user sync webhook
  lib/
    auth.ts                        # getCurrentDbUser, requireRole, hasRole
    db.ts                          # Prisma client singleton
    utils.ts                       # cn() class-name helper
  components/ui/
    button.tsx
    card.tsx
prisma/
  schema.prisma                    # Database schema
  seed.ts                          # Local dev seed
prisma.config.ts                   # Prisma 7 config (url, migrations)
docker-compose.yml                 # Local Postgres + Redis
```
