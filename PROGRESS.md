# JARVIS — Progress Tracker

**Last updated:** Post-launch improvement #1 — voice reliability fix (see `IMPROVEMENT_PLAN.md`)
**Status:** All 20 phases shipped and verified. Now working through `IMPROVEMENT_PLAN.md` — post-launch fixes and polish beyond the original 20-phase roadmap. See "What's real vs. mock" in each phase section below, and [`DEPLOYMENT.md`](./DEPLOYMENT.md) for taking this to production.

> **Rule for whoever (human or Claude) touches this project next: update this file in the SAME response that ships code changes — not after, not "later." If you shipped a ZIP, this file must reflect it before you're done.** See "How to update this file" at the bottom.

---

## Quick status table

| # | Phase | Status | Real or Mock? | Nav item |
|---|---|---|---|---|
| 1 | Foundation & Repo Setup | ✅ Done | Real | — |
| 2 | Database & ORM | ✅ Done | Real | — |
| 3 | Authentication & RBAC | ✅ Done | Real (Clerk) | — |
| 4 | App Shell & Design System | ✅ Done | Real | — |
| 5 | AI Command Center (text) | ✅ Done | Real (Gemini) | Command Center |
| 6 | Streaming Responses | ✅ Done | Real | (part of Command Center) |
| 7 | Hermes Orchestration Layer | ✅ Done | Real (Gemini function calling) | (part of Command Center) |
| 8 | Human-in-the-Loop Approvals | ✅ Done | Real | Audit Logs |
| 9 | Background Jobs (BullMQ + Redis) | ✅ Done | Real | Dashboard status card |
| 10 | Social Media (Buffer) | ✅ Done | **Mock service layer** | Social Media |
| 11 | Revenue (RevenueCat) | ✅ Done | **Mock service layer** | Revenue |
| 12 | Meta Ads | ✅ Done | **Mock service layer** | Meta Ads |
| 13 | Customer Support Agent | ✅ Done | Real (Gemini drafts) | Support Center |
| 14 | Daily Briefing Engine | ✅ Done | Real (Gemini + real stats) | Daily Briefings |
| 15 | Voice Layer (Text-to-Speech) | ✅ Done | Real (browser Web Speech API) | (part of Command Center) |
| 16 | Voice Layer (STT + Wake Word) | ✅ Done | Real (browser Web Speech API) | Voice Assistant |
| 17 | Long-Term Memory & Knowledge Base | ✅ Done | Real (Gemini embeddings + pgvector) | Knowledge Base |
| 18 | Notifications, Calendar, Task Management | ✅ Done | Real | Tasks, Calendar, notification bell |
| 19 | Security, Monitoring, Cost Tracking | ✅ Done | Real | Settings |
| 20 | Production Deployment | ✅ Done | Real (config/infra) | — |
| — | Analytics | ⛔ Not scoped to any phase yet | — | Locked, no badge |
| — | Automations (builder UI) | ⛔ Not scoped to any phase yet | — | Locked, no badge |

"Mock service layer" = fully functional UI/CRUD/persistence, only the final network hop to the real third-party API is simulated. See each phase's section below and the README's MCP Integrations table for the env var that flips it to real.

---

## Phase-by-phase detail

### Phase 1 — Foundation & Repo Setup ✅
Next.js 16, React 19, TypeScript, Tailwind v4, hand-built shadcn/ui components, ESLint/Prettier, Docker Compose (Postgres+Redis), design tokens in `globals.css`.

### Phase 2 — Database & ORM ✅
Prisma 7 + `@prisma/adapter-pg`. URL lives in `prisma.config.ts`, not `schema.prisma`. Schema currently has ~20 models across all shipped phases — see `prisma/schema.prisma`, it's organized in commented sections per phase.

### Phase 3 — Authentication & RBAC ✅
Clerk v6. Roles: ADMIN/MANAGER/SUPPORT/VIEWER. First registered user → ADMIN automatically. `src/lib/auth.ts`: `getCurrentDbUser()`, `requireRole()`, `hasRole()`.

### Phase 4 — App Shell & Design System ✅
Collapsible sidebar (Framer Motion, `useSyncExternalStore` for SSR-safe localStorage), top nav, glass-panel design system.

### Phase 5 — AI Command Center (text) ✅
Google Gemini (`gemini-3.5-flash`, free tier). `/api/chat`, conversation persistence to `Conversation` model.

### Phase 6 — Streaming Responses ✅
SSE streaming via `chat.sendMessageStream()`.

### Phase 7 — Hermes Orchestration Layer ✅
`HermesAgent` class, Gemini function calling, agentic loop (max 5 rounds). Tools live in `src/lib/hermes/tools.ts`, risk levels in `risk.ts`.

**Current tool list:** `get_current_time`, `get_system_stats`, `search_web` (stub — no phase scheduled yet), `create_task`, `clear_all_tasks`, `post_social_media`.

### Phase 8 — Human-in-the-Loop Approvals ✅
HIGH/CRITICAL risk tools require explicit approval. `AuditLog` model records every tool call. **Audit Logs UI was missing until the Phase 1–10 audit** (see below) — now live at `/dashboard/audit`, MANAGER+ only.

### Phase 9 — Background Jobs ✅
BullMQ + Redis, single `"jarvis"` queue, jobs differentiated by name. Scheduled via `upsertJobScheduler` (BullMQ v6 API — not the older `add(..., {repeat})` pattern). Jobs: `heartbeat` (every minute), `daily-briefing` (8 AM UTC, real since Phase 14), `sync-user`. **Requires `npm run worker` running in a separate terminal** — nothing in Phase 9+ works without it.

### Phase 10 — Social Media (Buffer) ✅ — Mock service layer
Buffer's free tier has no API access (paid plan required), so this ships against `src/lib/buffer/mock-service.ts`. Everything works for real except the final network hop:
- Connected Accounts, Create Post (draft/schedule/publish), Drafts, Scheduled, Published (with mock engagement numbers), Analytics, Settings — all real DB-backed CRUD.
- Architecture: `UI → BufferService interface → MockBufferService (now) / RealBufferService (later)`. Switch point: `src/lib/buffer/index.ts`, keyed on `BUFFER_ACCESS_TOKEN`.

### Phase 11 — Revenue (RevenueCat) ✅ — Mock service layer
Same pattern as Phase 10. `src/lib/revenuecat/`. Auto-seeds ~18 mock subscribers per user on first visit (deterministic, not re-randomized). Tabs: Overview (MRR/churn), Subscribers (search + grant promotional entitlement — the one real "write" action), Products, Transactions, Settings. Switch point: `REVENUECAT_API_KEY`.

### Phase 12 — Meta Ads ✅ — Mock service layer
Same pattern. `src/lib/metaads/`. Auto-seeds 6 mock campaigns with 30 days of daily stats. Tabs: Overview, Campaigns (create/pause/resume + 30-day click chart), Audiences (create Custom Audiences), Settings. Switch point: `META_ADS_ACCESS_TOKEN`.

### Phase 13 — Customer Support Agent ✅ — Real (no mock needed)
Unlike 10–12, this needs no third-party API — it reuses the already-real Gemini integration from Phase 5. `Ticket` + `TicketMessage` models. `/dashboard/support` (list + filters + create) and `/dashboard/support/:id` (thread + "Generate AI draft" button). AI drafts are always editable before sending — nothing auto-sends.

### Phase 14 — Daily Briefing Engine ✅ — Real (no mock needed)
Replaced the Phase 9 stub. `src/lib/briefing/generate.ts` pulls real 24h deltas from Tasks, Tickets, Ads, Social, Revenue, then has Gemini write a short narrative. Falls back to a plain-text rendering of the same real numbers if Gemini is unavailable — never fails silently. `/dashboard/briefings` — "Generate now" button for on-demand runs, otherwise runs via the worker's 8 AM UTC cron.

### Phase 15 — Voice Layer (Text-to-Speech) ✅ — Real (browser-native, no API key)
Uses the browser's built-in Web Speech API (`window.speechSynthesis`) — completely free, no third-party service, no server round-trip. `src/hooks/use-text-to-speech.ts` wraps it; settings (voice, rate, pitch, auto-speak toggle) persist to localStorage via the same `useSyncExternalStore` pattern as `useSidebar` (avoids the hydration-mismatch trap documented in the Phase 14 hotfix below).

Integrated directly into Command Center (no separate page/nav item — it's a feature of the existing chat, not a standalone module):
- Speaker toggle + settings popover (voice picker, speed, pitch) in the Command Center header.
- Per-message "read aloud" button appears on hover over any assistant reply.
- Auto-speak toggle reads new JARVIS replies aloud automatically as they finish streaming.
- Voice availability and quality depend entirely on the user's browser/OS — nothing JARVIS can control server-side.

### Phase 16 — Voice Layer (STT + Wake Word) ✅ — Real (browser-native, no API key)
Same free, no-API-key foundation as Phase 15 — uses `SpeechRecognition`/`webkitSpeechRecognition`. Honest limitation up front: this only works well in Chrome/Edge; Firefox and Safari have partial-to-no support, and the UI says so plainly rather than pretending otherwise.

- `src/hooks/use-speech-recognition.ts` — wraps the browser API for one-shot or continuous listening.
- `src/hooks/use-wake-word.ts` (`useWakeWordDetector`) — pure phrase-matcher over a transcript you feed it; does **not** own its own recognition instance (see Post-Phase-16 hotfix below for why).
- New page **`/dashboard/voice`** — a single continuous `SpeechRecognition` instance drives the whole session (armed → capturing → armed → …): arm the wake word or tap the mic → speak → silence-cutoff or manual tap sends the transcript to `/api/chat` (same endpoint Command Center uses, so it persists to the same `Conversation` table) → response streams back → Phase 15's TTS speaks it → listening resumes automatically if "continuous conversation" is on.
- Real barge-in: a Stop button (or tapping the mic) while JARVIS is thinking/speaking cancels the request and speech immediately.
- Dashboard's "Voice Sessions" stat card intentionally shows `"Live"` rather than a count — voice turns aren't tracked separately from text turns server-side (they go through the same `/api/chat` endpoint), so a fabricated session count would violate the "no UI number without a real query" rule. If per-channel tracking is wanted later, that needs an explicit `channel` field added to `Conversation`.

### Phase 17 — Long-Term Memory & Knowledge Base ✅ — Real (Gemini embeddings + pgvector, no separate API key)
Real semantic search, no mock layer — uses Gemini's free `text-embedding-004` endpoint (768-dim vectors, same `GOOGLE_AI_API_KEY` as everything else) plus pgvector for cosine-similarity search in Postgres.

**⚠️ Requires a Docker image change.** `docker-compose.yml` now uses `pgvector/pgvector:pg16` instead of `postgres:16-alpine` — plain Postgres doesn't ship the vector extension. Anyone pulling this phase needs to run `docker compose up -d --force-recreate postgres` (or `docker compose down && docker compose up -d` if that's simpler) to pick up the new image, then `npx prisma migrate dev` as usual — the migration will run `CREATE EXTENSION IF NOT EXISTS vector`.

- Two new models: `KnowledgeDocument` (documents you save) and `AgentMemory` (facts JARVIS is told to remember). Both have an `embedding Unsupported("vector(768)")?` column — Prisma Client has no native vector type, so **all reads/writes touching `embedding` go through `$queryRaw`/`$executeRaw`**, not the normal typed Prisma Client methods. See `src/lib/knowledge/documents.ts` and `memory.ts`.
- Documents/memories are created immediately (readable right away) even if embedding fails (e.g. missing API key) — they just won't show up in semantic search until re-embedded. The UI shows a "not searchable yet" badge in that case rather than hiding the item.
- New page **`/dashboard/knowledge`** — Documents tab (save + semantic search) and Memories tab (remember + recall), both showing a similarity percentage on search results.
- Three new Hermes tools: `remember_fact` (medium risk), `recall_memory` and `search_knowledge_base` (both low risk, read-only) — so the agent can use this from Command Center/voice, not just the dedicated page.
- Hardened the sandbox's build-time Prisma stub (`node_modules/.prisma/client/default.js`) to handle `$queryRaw`/`$executeRaw`/`$transaction` gracefully — these are new as of this phase and the stub previously only handled model accessors like `db.user`.

### Phase 18 — Notifications, Calendar, Task Management ✅ — Real, no mock layer
Three connected features, all genuinely functional and fed by real triggers elsewhere in the app rather than a standalone feature with nothing driving it:

- **`Task` model extended** with `description`, `dueDate`, `reminderSentAt`. New page **`/dashboard/tasks`** — full CRUD, status/priority filters, overdue badge. The `create_task` Hermes tool now accepts an optional `dueDate` too.
- **New `CalendarEvent` model.** New page **`/dashboard/calendar`** — a real month-grid view (built with plain `Date` math, no calendar library dependency), click a day to add an event, click a day with events to see/delete them.
- **New `Notification` model** + a real bell dropdown in the top nav (polls every 30s, unread badge, mark-one/mark-all read). Fed by genuine triggers, not manufactured for the sake of having notifications:
  - **Task due-date reminders** — new hourly worker job (`task-reminders`) notifies the task owner when a due date is within 24h, and sets `reminderSentAt` so it's never sent twice.
  - **Approval needed** — firing the moment a Hermes tool call requires human approval (Phase 8), not after the fact.
  - **Ticket assigned to you** / **Ticket escalated** — from the Support Center status route (Phase 13).
  - **Daily briefing ready** — from the worker's `daily-briefing` job (Phase 14), notifies every user since `Briefing` isn't scoped to one user.
- Both Tasks and Calendar nav items enabled; the previously-placeholder bell button in `top-nav.tsx` ("Notifications — Phase 18") replaced with the real `NotificationBell` component.

### Phase 19 — Security, Monitoring, Cost Tracking ✅ — Real, no mock layer
- **New `AiUsageLog` model.** Every Gemini call — chat, Hermes, support drafts, briefings, knowledge/memory embeddings — now logs its *real* token counts, read directly off the API response's `usageMetadata` (never estimated or simulated). `src/lib/usage/pricing.ts` estimates a dollar cost from Gemini's published paid-tier pricing purely for visibility — actual cost stays $0 on the free tier this app is built for, and the UI says so plainly.
- **New `/dashboard/settings` page** (MANAGER+ gated): a Usage & Cost tab with real 30-day totals, per-feature breakdown, and a recent-calls table; a Security tab documenting what's actually enforced (not aspirational copy).
- **Real Redis-backed rate limiting** (`src/lib/rate-limit.ts`, fixed-window via `INCR`/`EXPIRE` on the same Redis instance BullMQ already uses) — 20 chat messages / 5 min and 10 Hermes agent runs / 5 min, per user. Returns HTTP 429 + `Retry-After`. Fails *open* (allows the request) if Redis is unreachable, so a rate-limiter outage never takes down the feature it protects.
- **Real security headers** in `next.config.mjs` — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (explicitly allows microphone for Phases 15/16, denies camera/geolocation). **Content-Security-Policy intentionally deferred to Phase 20** — getting CSP directives wrong for Clerk's hosted UI risks silently breaking sign-in, and this needs testing against a real deployed origin, not guessed at in local dev.
- Settings nav item enabled.

### Phase 20 — Production Deployment ✅ — Real config/infra, honestly scoped
No live deployment exists (this project has no hosting account or domain) — but everything needed to actually deploy is real, not aspirational documentation:

- **`next.config.mjs`**: `output: "standalone"` enabled (verified the build still produces `.next/standalone/server.js` correctly). **Content-Security-Policy implemented** (deferred from Phase 19) — real directives matching Clerk's documented CSP requirements, gated behind `ENABLE_CSP=true` (off by default) since it needs verification against a real deployed origin before being safe to rely on.
- **`GET /api/health`** — real DB + Redis checks (not a hardcoded 200), returns 503 on failure so orchestrators can act on it. Unauthenticated by design (load balancers can't log in).
- **`Dockerfile`** (multi-stage, non-root user, wired to `/api/health` via `HEALTHCHECK`) for the app, **`Dockerfile.worker`** for the background worker as a separate long-running process (can't run on pure serverless — see DEPLOYMENT.md for why this matters), **`docker-entrypoint.sh`** runs `prisma migrate deploy` against the real production DB on every container start.
- **`docker-compose.prod.yml`** — full self-hosted stack (app + worker + Postgres/pgvector + Redis), Postgres/Redis ports intentionally not exposed to the host.
- **`.env.production.example`** — production env template; hostnames correctly use Docker service names (`postgres`, `redis`), not `localhost`.
- **`DEPLOYMENT.md`** — genuine deployment guide (Docker self-host as primary path, split Vercel+worker-elsewhere as an alternative), explicit about the worker-process constraint that rules out plain serverless.
- **Fixed a real pre-existing bug while in `.gitignore`**: the `.env*` pattern was also silently excluding `.env.example` and `.env.production.example` from git — meaning the templates meant to be shared would never actually get committed. Added explicit `!.env.example` / `!.env.production.example` negations.
- `package.json` gained `docker:build`/`docker:up`/`docker:down`/`docker:logs` convenience scripts.

**What Phase 20 does NOT claim**: no CI/CD pipeline, no actual tested live deployment, no log aggregation/APM, no automated Postgres backups. All stated explicitly in `DEPLOYMENT.md`'s "What Phase 20 does NOT include" section rather than left implicit.

---

## Phase 1–10 Audit (completed, see full report in chat history)

A full audit was done because the dashboard claimed "Phase 10 complete" while several things were actually disconnected. Fixed:
- Dashboard stat cards were hardcoded `"—"` placeholders → now real queries (conversation count, user count, completed job count).
- System Status card was hardcoded `"operational"` for everything → now does real checks (DB query, Redis queue check, `GOOGLE_AI_API_KEY` presence).
- "Coming Next" section still listed Phases 5–7 as upcoming even though they'd shipped → fixed, now shows genuinely upcoming phases (kept current through each subsequent phase since).
- Audit Logs nav item was disabled despite the backend (`AuditLog` table) being fully populated since Phase 8 → built the missing UI, enabled the nav item.
- Analytics and Automations nav items had misleading phase badges (P4 and P9 respectively) implying they shipped with phases that never actually built them → badges removed, left honestly unscoped/locked.

**Takeaway for future work:** when a phase ships, immediately check whether the dashboard roadmap, stat cards, "Coming Next" list, and nav badges still reflect the new true state. This has caused rework twice already.

---

## Post-Phase-14 hotfix

Fixed a hydration mismatch + "state update on unmounted component" warning, both traced to Clerk's `<UserButton>` reconciling its own DOM attributes after mount (a known Clerk+SSR pattern, not a bug in our markup). Fix: `src/components/layout/sidebar.tsx` now gates `UserButton` behind a `useSyncExternalStore`-based mounted flag, rendering a matching-size skeleton until the client has hydrated.

## Post-Phase-15 hotfix

Fixed another hydration mismatch: `formatTime()` in Command Center used `date.toLocaleTimeString(undefined, ...)` — passing `undefined` as the locale lets the *runtime environment* pick its own default, which differs between the Node.js server process and the browser (server rendered `01:16 pm`, client rendered `01:16 PM`). Same root category as the Phase 14 UserButton bug (a real, reproducible SSR/CSR divergence), different mechanism.

Fix: added `src/lib/format.ts` — shared `formatTime`/`formatDate`/`formatDateTime`/`formatNumber` helpers that all pin `"en-US"` explicitly so server and client always agree. Audited the whole codebase for the same pattern (`grep -rn "toLocaleString(\|toLocaleDateString(\|toLocaleTimeString("`) and replaced every unlocaled call in a JSX render path: Command Center, Revenue, Social Media, Meta Ads, Audit Logs, Daily Briefings, and Support Center ticket views. Remaining unlocaled calls are all in server-side text (API error messages, Hermes tool summaries) — not JSX, not a hydration risk, left as-is.

**Rule going forward:** never call `.toLocaleString()`/`.toLocaleDateString()`/`.toLocaleTimeString()`/`.toLocaleString()` (for numbers) directly in a component that can be server-rendered — always go through `src/lib/format.ts`, or explicitly pin a locale inline if a new one-off format is genuinely needed there.

## Post-Phase-16 hotfix

User-reported issues after trying the Voice Assistant for real: mic button unreliable ("works sometimes, doesn't other times"), wake word mis-heard fairly often with no visibility into what was actually heard, no way to interrupt JARVIS mid-reply, and no natural back-and-forth flow (had to re-arm/re-trigger for every turn).

**Root cause of the reliability bug:** the original implementation ran *two separate* `SpeechRecognition` instances — one owned by `useWakeWord` (continuous, listening for the phrase) and one for command capture (`useSpeechRecognition` one-shot). Browsers don't reliably support two concurrent recognition sessions on the same microphone; starting the second one while the first was still tearing down (an async operation) intermittently failed silently. That's exactly "works sometimes, doesn't other times."

**Fix — architecture change:** Voice Assistant now runs exactly **one** continuous `SpeechRecognition` instance for the entire session (armed → capturing → armed → …), never two at once.
- `useWakeWord` was rewritten as `useWakeWordDetector` — a pure phrase-matcher over whatever transcript text you feed it, with no `SpeechRecognition` of its own.
- Silence-based cutoff added (1.6s of no new speech while capturing → auto-send), since continuous mode doesn't auto-stop on silence the way one-shot mode does.
- **Barge-in / interrupt**: a visible "Stop" button (and clicking the mic itself) while JARVIS is thinking/speaking now genuinely cancels the in-flight request (`AbortController`) and stops speech synthesis (`tts.stop()`) immediately, then resumes listening.
- **Live "Heard: ..." transcript line** now shows continuously while armed/capturing, so mis-hearings (e.g. "bajaj stock" instead of a wake phrase) are visible and debuggable instead of a silent mystery.
- **Continuous conversation mode** (on by default, toggle in settings): after each reply, listening resumes automatically without needing the wake phrase again — closer to the "real-time conversation" the user asked for. "End session" fully stops everything.

---

## Post-launch improvements (see IMPROVEMENT_PLAN.md for full plan)

With all 20 phases shipped, further work is tracked in `IMPROVEMENT_PLAN.md` (voice reliability, Analytics/Automations scoping, visual identity, dashboard redesign, mock→real readiness) rather than as new numbered phases.

### #1 — Voice reliability fix ✅
Root-caused three real issues with "hey JARVIS" not listening reliably: (1) silent mic permission loss mid-session with zero visible error, (2) browser tab-backgrounding silently killing the continuous recognition loop, (3) no way to tell if the mic itself was even being captured vs. the wake word just not matching. Fixed all three — see `IMPROVEMENT_PLAN.md` section 1 for the full breakdown. New files: `src/hooks/use-mic-permission.ts`, `src/hooks/use-mic-test.ts`.



- **Phases 10–12 are mock-only.** Buffer, RevenueCat, and Meta Ads all require paid/business-verified accounts JARVIS's user doesn't have. The mock service layer is a deliberate, permanent-until-upgraded architecture choice, not a shortcut — see each phase's section above for the switch-over mechanism.
- **Voice quality/availability (Phase 15) depends on the user's browser and OS**, not JARVIS. Some browsers ship very few voices; mobile Safari and Chrome differ significantly. There's no server-side fallback — if `window.speechSynthesis` isn't present, the speaker controls simply don't render (checked via `tts.isSupported`).
- **`search_web` Hermes tool is still a stub** — no phase currently scheduled to implement it for real.
- **AI usage tracking (Phase 19) has one known gap**: if a Hermes agent run pauses for human approval (Phase 8) mid-loop, the tokens used in that partial run aren't logged — only completed runs log usage. Minor (approval-pausing tool calls are a small fraction of traffic), but real, and not hidden here.
- **Analytics and Automations (builder UI) are not scoped to any phase.** They show as locked in the sidebar with no phase badge. If the user wants either built, it needs to be scoped as a real phase first (what does "Analytics" show? what does "Automations" let someone configure?) before writing code for it.
- **The build sandbox has no live Postgres/Redis/Clerk/Gemini.** Every phase is verified with `tsc --noEmit` + `lint` + `build`, never with a live database connection or a real end-to-end click-through. The user has to smoke-test locally after every extraction — this has been stated explicitly after the Phase 1–10 audit and should keep being stated, not just assumed understood.
- **`.env` has real Clerk + Gemini keys committed in it** (pre-existing from earlier sessions, flagged during the doc rewrite). Fine for solo local dev, but should move to `.env.local` (gitignored) or be rotated before this repo is ever made public/shared.

---

## How to update this file

Every time a phase ships (or a hotfix, or an audit), before ending that turn:

1. Update the **quick status table** — flip the status, note real-vs-mock.
2. Add or extend that phase's entry in **Phase-by-phase detail** — what was built, what's real vs mocked, the switch-over env var if applicable, key file paths.
3. If the change touched **environment variables**, update `.env.example` and `README.md`'s env-related sections too — they must never drift from what the code actually reads (`grep -rn "process.env\." src` is the fast way to verify).
4. If the change fixed a bug, log it under a dated "hotfix" section like the one above — don't just silently fix and move on, the next person needs to know it happened and why.
5. Update **"Last updated"** at the top of this file.
6. If scope/direction changed (e.g. a phase turned out to need a paid API and got mocked instead), record that decision and the reasoning — future sessions need to know *why*, not just *what*.
