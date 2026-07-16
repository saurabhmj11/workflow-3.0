# ─── OpenWorkflow Dockerfile ────────────────────
# Multi-stage build for production deployment
# Supports both SQLite and PostgreSQL via DATABASE_URL
#
# Stage 1: Install dependencies
# Stage 2: Build the Next.js app
# Stage 3: Production runtime
# ───────────────────────────────────────────────────

# ---- Stage 1: Dependencies ----
FROM node:26-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# ---- Stage 2: Build ----
FROM node:26-alpine AS builder
WORKDIR /app

RUN npm install -g bun

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ---- Stage 3: Production ----
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install PostgreSQL client libraries for pg connection
# and libc6-compat for native bindings
RUN apk add --no-cache postgresql-client libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db

# Create data directory for SQLite (if used) with proper permissions
RUN mkdir -p /app/db && chown -R nextjs:nodejs /app/db

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api || exit 1

CMD ["node", "server.js"]
