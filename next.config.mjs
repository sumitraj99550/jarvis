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
   *
   * With these listed, Next.js loads them via Node.js `require()` at runtime
   * rather than bundling them, which is exactly how they're designed to work.
   */
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "prisma",
  ],
};

export default nextConfig;
