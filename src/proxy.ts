import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk middleware (Next.js 16 — file must be named proxy.ts).
 *
 * This is intentionally a pass-through middleware. Route protection is
 * handled inside each layout/page via `auth()` server-side calls:
 *
 *   - src/app/(dashboard)/layout.tsx  → auth guard for all /dashboard/* routes
 *   - src/app/page.tsx               → redirects based on auth state
 *
 * Why not use createRouteMatcher?
 * Clerk v6 deprecated middleware-based route matching because path patterns
 * can diverge from how Next.js actually resolves routes, creating false
 * security. Resource-based checks in layouts are the recommended pattern.
 *
 * The middleware still runs on every request so Clerk can set up its
 * session context — that's all it needs to do here.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
