import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public routes — Clerk does NOT require authentication for these.
 *
 * Everything else is private by default: attempting to access a non-public
 * route without a valid Clerk session triggers auth.protect(), which
 * redirects the browser to the sign-in page.
 *
 * Pattern syntax: strings are treated as path prefixes; `(.*)` means
 * "this path and any sub-paths".
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)", // Clerk sign-in UI
  "/sign-up(.*)", // Clerk sign-up UI
  "/api/webhooks(.*)", // Clerk webhook — must stay public so Clerk can POST to it
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // auth.protect() redirects to sign-in if there is no active session.
    // It does nothing if the user is already authenticated.
    await auth.protect();
  }
});

/**
 * Next.js middleware matcher.
 *
 * The negative lookahead excludes:
 *   - Next.js internals  (_next/*)
 *   - Static asset files (images, fonts, favicon, etc.)
 *
 * The second pattern ensures API and tRPC routes are always processed.
 * This is copied verbatim from Clerk's official Next.js App Router docs.
 */
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
