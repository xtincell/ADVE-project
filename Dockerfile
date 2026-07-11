# syntax=docker/dockerfile:1
#
# La Fusée OS — container image for Cloudflare Containers (and any Node host).
# Runs the Next.js standalone server (`output: "standalone"` in next.config.ts).
#
# Stages: deps → builder → runner. The runner ships only the standalone bundle
# (+ static + public), not the full node_modules or source.

# ── deps ─────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Skip puppeteer's Chromium download — the runner installs system Chromium.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# `npm ci` runs `postinstall` (prisma generate) — needs the schema above.
RUN npm ci

# ── builder ──────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Placeholder build-time env. The lazy Prisma proxy (src/lib/db.ts) means the
# build never connects to the DB; real secrets are injected at runtime by the
# Worker. These only satisfy any module that reads env during `next build`.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV NEXTAUTH_SECRET="build-time-placeholder-build-time-placeholder"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV AUTH_URL="http://localhost:3000"
ENV NEXT_PUBLIC_BASE_URL="http://localhost:3000"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runner ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Chromium for puppeteer (Oracle / intake PDF). Remove this block + the two
# PUPPETEER_* envs to slim the image by ~300 MB if you don't need PDF export;
# the PDF routes then return a clean 500 instead of generating.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium ca-certificates fonts-liberation \
      libnss3 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 libxkbcommon0 \
      libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Non-root runtime user.
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone server + assets. `server.js` is emitted by the standalone build;
# `public/` and `.next/static` are not included in standalone and must be copied.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma client + driver adapter. Next's standalone trace omits the Prisma WASM
# query compiler and `@prisma/adapter-pg`, which would break DB access at
# runtime, so copy the generated client + the full @prisma scope explicitly.
# (The `pg` driver and its deps ARE traced into standalone.)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Migrations Prisma + applicateur maison. Le CLI Prisma N'EST PAS fiable dans
# l'image standalone (trace élaguée → WASM + deps `@prisma/config`/`effect`
# manquants ; cf. incidents 2026-07-10/11). L'entrypoint applique donc les
# migrations via `scripts/apply-migrations.mjs` — ZÉRO dep, juste `pg` (déjà
# tracé, l'app en dépend). On copie les fichiers de migration + le runner +
# l'entrypoint ; pas besoin du CLI Prisma ni de `prisma.config.ts` au runtime.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts/apply-migrations.mjs ./scripts/apply-migrations.mjs
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
CMD ["./scripts/docker-entrypoint.sh"]
