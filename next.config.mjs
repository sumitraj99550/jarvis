/**
 * Next.js configuration.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /**
   * Server-external packages — do not bundle these with Turbopack/webpack.
   *
   * - `@prisma/client`   : the generated Prisma client uses WASM + native
   *                        Node.js require() semantics; bundling breaks it.
   * - `@prisma/adapter-pg` and `pg` : the PostgreSQL driver adapter uses
   *                        native Postgres TCP sockets via Node.js net APIs,
   *                        which can't be bundled into a browser-compatible
   *                        chunk by Turbopack.
   * - `prisma`           : the Prisma CLI package; never needed at runtime
   *                        but listed here to be safe.
   * - `bullmq` and `ioredis` : the background job queue client and its
   *                        Redis driver (Phase 9) open raw TCP sockets via
   *                        Node.js net APIs, same constraint as `pg` above.
   *
   * With these listed, Next.js loads them via Node.js `require()` at runtime
   * rather than bundling them, which is exactly how they're designed to work.
   */
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "prisma",
    "@google/generative-ai",
    "bullmq",
    "ioredis",
  ],

  /**
   * Security headers (Phase 19) — applied to every route. Real HTTP
   * headers the browser genuinely enforces, not decorative.
   *
   * - X-Frame-Options / frame-ancestors: blocks this app from being
   *   embedded in an iframe on another site (clickjacking protection).
   * - X-Content-Type-Options: stops the browser from MIME-sniffing
   *   responses into an executable type.
   * - Referrer-Policy: doesn't leak full URLs (which can contain query
   *   params) to third-party sites linked from this app.
   * - Permissions-Policy: explicitly allows microphone (Phase 15/16 voice
   *   features need it) and denies camera/geolocation, which nothing in
   *   this app uses.
   * - CSP is intentionally NOT set here: Clerk's hosted auth UI, several
   *   third-party script/style origins, and Next.js's own inline
   *   hydration scripts all need explicit allowlisting to avoid breaking
   *   the app, and getting that wrong silently breaks sign-in. Deferred to
   *   Phase 20 (Production Deployment) where it can be tested against a
   *   real deployed origin instead of guessed at in local dev.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
