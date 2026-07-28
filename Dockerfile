# Standalone build — this app has no CLI to run inside the container (the
# daily scheduler calls src/lib/* functions directly from within the Next.js
# server itself, see src/instrumentation.ts), unlike payload-cms's image,
# which needs the full node_modules for the Payload CLI's `migrate` command.

FROM node:22.17.0-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
# node:22.17.0-alpine ships npm 10.9.2; package-lock.json is generated with
# npm 11.x locally. That version skew produces phantom "out of sync" errors
# on optional dependencies (@emnapi/* etc.) that a plain lockfile refresh
# doesn't fix -- matching the npm version is the actual fix.
RUN npm install -g npm@11
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# prisma generate and `next build` both need DATABASE_URL/DIRECT_URL to
# resolve as valid connection strings (Prisma's config loader and
# src/db/client.ts's URL parsing both run at module-evaluation time, reached
# while Next.js collects page data for the API routes) — but neither needs
# to actually reach a database at build time. Dummy values only; the real
# ones come from Coolify at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=blog"
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build?schema=blog"

RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
