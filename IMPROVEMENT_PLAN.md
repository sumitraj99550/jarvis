# JARVIS — Post-Launch Improvement Plan

All 20 roadmap phases are built (see `PROGRESS.md`). This document is the plan for what comes next — the gaps and rough edges found after actually using the finished product, not new roadmap phases. Each section below is independent and gets its own delivery (own ZIP, own verification, own PROGRESS.md entry) once we start executing — this file is the plan only, no code changes yet.

**How to use this doc**: read it, tell me which section to start on (or re-order/cut anything), and we go one section at a time. Checkboxes get ticked off here as each one ships, same as PROGRESS.md tracks the original 20 phases.

---

## 0. Authentication — no action needed

Checked as part of writing this plan: Clerk auth, RBAC (ADMIN/MANAGER/SUPPORT/VIEWER), webhook sync, and the `getCurrentDbUser()`/`requireRole()` helpers are all working as built in Phase 3 and haven't degraded. Nothing to fix here — listed for completeness since it was asked about directly.

---

## 1. Voice reliability fix ("hey JARVIS" not listening) — ✅ Done

### Root causes (real, not guesses)
1. **Browser support**: Chrome/Edge only. Safari/Firefox have partial-to-no `SpeechRecognition` support — this is a platform limitation, not a bug, but the app should make it obvious *before* you try talking to it, not after.
2. **Silent mic permission loss**: browsers can revoke mic permission mid-session (user navigates away and back, permission prompt gets dismissed, OS-level mic access changes) without any visible error — the recognition engine just stops picking anything up.
3. **Background tab throttling**: browsers deprioritize/pause JS timers and media APIs in backgrounded tabs, which can silently kill the continuous listening loop.

### What shipped
- [x] Real mic permission tracking via `navigator.permissions.query` (`src/hooks/use-mic-permission.ts`) — shows a clear "Microphone access needed" / "access denied" banner with an Enable button, instead of a wake word that quietly never triggers. Falls back gracefully on Firefox (which doesn't support querying "microphone" permission).
- [x] `document.visibilitychange` handling — pauses the recognition engine when the tab is backgrounded and cleanly resumes the same mode (armed/capturing) when it's foregrounded again, instead of letting the browser silently kill it.
- [x] Persistent animated pulse ring around the mic button whenever armed or capturing — unmissable whether it's actually listening.
- [x] "Test my mic" button (`src/hooks/use-mic-test.ts`) — records 2.5s via `MediaRecorder` and plays it back, so you can confirm mic capture works independent of whether the wake word matches.
- [x] Clearer browser-compatibility banner, explicit that TTS (JARVIS talking back) works everywhere even when STT doesn't.

---

## 2. Analytics — scope it as a real phase, then build it

### Why it's empty today
It was never assigned a phase in the original 20-phase roadmap (unlike every other sidebar item). Genuinely unbuilt, not broken.

### Proposed scope
A single cross-module reporting page pulling from data that **already exists** — no new integrations needed:
- Tasks completed vs. created (trend line, from Phase 18 data)
- Support tickets: open/resolved/escalated over time (Phase 13 data)
- Revenue: MRR trend, active subscribers (Phase 11 data)
- Ad spend & CTR trend (Phase 12 data)
- Social posts published over time (Phase 10 data)
- AI usage & cost trend (Phase 19 data — this one's genuinely new dashboarding of existing logs)

### Plan
- [ ] New `/dashboard/analytics` page with a date-range picker (7d/30d/90d)
- [ ] One aggregation API route per module reusing existing tables (no schema changes needed)
- [ ] Chart components (reuse the existing `chart_display_v0`-style pattern already used elsewhere, or a lightweight charting lib)
- [ ] Enable the nav item with a real phase number once built

**Effort**: medium — mostly aggregation queries + chart UI, all source data already exists.

---

## 3. Automations — scope it as a real phase, then build it

### Why it's empty today
Same reason as Analytics — never scoped.

### Proposed scope
A simple **trigger → action** rule builder, backed by the notification system already built in Phase 18:
- Triggers: "task overdue", "ticket escalated", "new subscriber", "campaign spend exceeds $X", "daily briefing ready"
- Actions (v1, all already-real capabilities): "send notification", "create a task", "send Hermes agent a prompt"
- Rules stored in a new `Automation` model, evaluated by a new worker job (same pattern as Phase 18's `task-reminders` job)

### Plan
- [ ] New `Automation` model (trigger type, condition, action type, enabled flag, owner)
- [ ] New `/dashboard/automations` page — list rules, create/edit/toggle/delete
- [ ] New worker job evaluating active rules on a schedule (or hooked into the same events that already fire notifications in Phase 18 — cheaper and more real-time than polling)
- [ ] Enable the nav item with a real phase number once built

**Effort**: medium-large — this is the biggest net-new piece in this plan (new data model + new worker logic + new UI).

---

## 4. Visual identity — move off single-color flat theme

### Current state
Everything uses one accent color (`--primary: #3ddcff`, cyan) globally. Functional but flat — doesn't visually distinguish modules or feel like a premium product.

### Plan
- [ ] Give each **module** (not each page) its own accent color, used only for that module's icons/highlights/charts — global chrome (sidebar, top nav, buttons) stays consistently branded so it doesn't look chaotic:
  - Command Center / Hermes → cyan (current primary, stays the "home" brand color)
  - Social Media → pink/magenta
  - Revenue → green
  - Meta Ads → orange
  - Support Center → purple
  - Voice Assistant → teal
  - Knowledge Base → amber
- [ ] Add these as new CSS custom properties alongside the existing tokens (`--module-social`, `--module-revenue`, etc.) — additive, doesn't touch the existing token system, so nothing breaks.
- [ ] Optional stretch: light/dark theme toggle. The CSS variable architecture already in place makes this mechanical (swap the `:root` block based on a class), not a rewrite — worth doing if you want it, otherwise skip.

**Effort**: small-medium — CSS token additions + applying them to existing module icon/header locations, no component rewrites needed.

---

## 5. Dashboard redesign — stop looking like a build log

### Current state
The dashboard homepage leads with "Phase 19 of 20 complete," a 20-item roadmap checklist, and phase badges throughout the sidebar. That's useful *to me* while building, not to you while using the product.

### Plan
- [ ] Move all "Phase X" / roadmap/build-progress content off the homepage into a dedicated `/dashboard/about` page (or fold into Settings) — still accessible, just not the first thing you see.
- [ ] Replace the homepage with **live operational widgets** built from your actual data:
  - Today's calendar events + upcoming tasks due
  - Open/unread notifications
  - Recent AI activity (last few Command Center / Hermes interactions)
  - Quick stats that already exist for real (active subscribers, open tickets, ad spend this month)
- [ ] Remove "Pn" phase badges from the sidebar for shipped features (they're no longer useful once everything's built) — keep them only on Analytics/Automations until those get real phase numbers per sections 2–3.

**Effort**: medium — mostly rearranging/repurposing data already being fetched elsewhere, plus new widget components.

---

## 6. Mock → Real readiness (Buffer, RevenueCat, Meta Ads)

### Current state — already done correctly
Each of these three already follows the same clean architecture:

```
UI → Service Interface → MockService (active now) / RealService (stub, throws "not implemented")
```

Switching to real API keys already works mechanically — the env var (`BUFFER_ACCESS_TOKEN`, `REVENUECAT_API_KEY`, `META_ADS_ACCESS_TOKEN`) is already read by each module's `index.ts` selector. Nothing structural needs to change.

### What's actually needed
The `RealBufferService` / `RealRevenueCatService` / `RealMetaAdsService` classes currently just throw `"not implemented"` — the real HTTP calls to each provider's API were never written (since none of us have live keys yet).

### Plan
- [ ] When you get a real API key for any one of the three, tell me which — I'll fill in that specific `real-service.ts` file's HTTP calls against that provider's actual REST API (already documented in code comments), test the switch-over, and confirm the mock/real boundary still works cleanly.
- [ ] No plan action needed until you have a key — this section exists just to confirm readiness, not to assign work yet.

**Effort**: small per-provider, once a real key exists — the interface/plumbing work is already done.

---
## Suggested order

Given effort vs. impact:

1. **Voice reliability fix** — quick, fixes an active frustration
2. **Dashboard redesign** — quick-medium, immediately makes the whole app feel more like a product
3. **Visual identity** — quick-medium, compounds well with #2
4. **Analytics** — medium, pure upside, no new integrations
5. **Automations** — medium-large, the most net-new work
6. **Mock→Real** — whenever you actually have a key, not before

This is just a suggestion — reorder however you want. Tell me which number(s) to start on.
