/**
 * Next.js configuration.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /**
   * Phase 20: produces a self-contained `.next/standalone` build with only
   * the production dependencies actually used, traced automatically. This
   * is what Dockerfile copies into the final image layer — without it,
   * the image would need the full node_modules (much larger, slower to
   * build/deploy).
   */
  output: "standalone",

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
   *
   * Content-Security-Policy (Phase 20): now implemented, but gated behind
   * `ENABLE_CSP=true` — off by default so local dev never breaks
   * unexpectedly. Turn it on once deployed to a real origin and verify
   * sign-in, the AI chat stream, and voice features (Phases 15/16) all
   * still work before relying on it in production. Directives below are
   * Clerk's documented CSP requirements (https://clerk.com/docs/security/clerk-csp)
   * plus 'unsafe-inline'/'unsafe-eval' for Next.js's own hydration
   * scripts and Tailwind's runtime styles — tightening those further
   * requires Next's experimental nonce support, left for a future pass.
   */
  async headers() {
    const cspEnabled = process.env.ENABLE_CSP === "true";
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.*.lcl.dev",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.accounts.dev",
      "font-src 'self' data:",
      "connect-src 'self' https://*.clerk.accounts.dev https://generativelanguage.googleapis.com wss://*.clerk.accounts.dev",
      "frame-src 'self' https://*.clerk.accounts.dev",
      "worker-src 'self' blob:",
    ].join("; ");

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
          ...(cspEnabled
            ? [{ key: "Content-Security-Policy", value: csp }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
