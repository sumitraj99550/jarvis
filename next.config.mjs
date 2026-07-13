/**
 * Next.js configuration.
 *
 * `next.config.ts` is not supported in this version of Next.js 16 — the
 * TypeScript config file requires a separate compile step that isn't wired up
 * by default. We use `.mjs` (native ES modules) instead so we can use
 * `export default` without needing `"type": "module"` in package.json.
 * The `@type` JSDoc comment restores full editor autocomplete.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  /**
   * Mark Prisma and its generated client as server-external packages.
   *
   * By default, Next.js / Turbopack tries to bundle all imports — including
   * `@prisma/client` — into its own chunk. The Prisma generated client
   * (`node_modules/.prisma/client/`) relies on native Node.js `require()`
   * semantics and a post-generate file that doesn't exist until
   * `prisma generate` runs. Bundling breaks both of these.
   *
   * `serverExternalPackages` tells Next.js to skip bundling these packages
   * and instead use Node.js's native `require()` at runtime. This means:
   *   - The build never tries to statically evaluate `@prisma/client`
   *   - At runtime, the generated `.prisma/client/` directory is loaded
   *     by Node.js normally, exactly as Prisma intends.
   *
   * See: https://nextjs.org/docs/app/api-reference/next-config-js/serverExternalPackages
   */
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
