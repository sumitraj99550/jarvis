# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# JARVIS — Production Dockerfile (Next.js app)
# ---------------------------------------------------------------------------
# Multi-stage build: install deps -> build -> minimal runtime image using
# Next.js's `output: "standalone"` (see next.config.mjs) so the final image
# only contains the production dependencies actually traced/used, not the
# full node_modules.
#
# Build:  docker build -t jarvis-app .
# Run:    docker run -p 3000:3000 --env-file .env.production jarvis-app
# (Usually run via docker-compose.prod.yml instead — see that file.)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Prisma's postinstall (`prisma generate`) needs the schema present.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./
COPY . .
# DATABASE_URL isn't real at build time — `prisma generate` only needs the
# schema, not a live connection. Actual migrations run at container start
# (see docker-entrypoint.sh), against the real production database.
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user — standard container security practice.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 jarvis

COPY --from=builder /app/public ./public
COPY --from=builder --chown=jarvis:nodejs /app/.next/standalone ./
COPY --from=builder --chown=jarvis:nodejs /app/.next/static ./.next/static
# Prisma's generated client engine files aren't always picked up by
# Next's dependency tracing — copy explicitly to be safe.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER jarvis
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
