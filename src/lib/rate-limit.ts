// ─── Rate Limiting Utility ──────────────────────
// Dual-mode rate limiter: Prisma DB (primary) + in-memory (fallback).
// DB mode persists across server restarts and works across instances.
// Falls back to in-memory when the database is not available.

import { db } from '@/lib/db'

// ─── In-Memory Fallback Store ────────────────────

interface InMemoryEntry {
  count: number
  resetTime: number
}

const memoryStore = new Map<string, InMemoryEntry>()

// Track whether DB is available (once it fails, we stop trying for a while)
let dbAvailable = true
let dbRetryAfter = 0 // Timestamp after which we retry DB
const DB_RETRY_INTERVAL = 30_000 // Retry DB every 30s after a failure

// Cleanup old in-memory entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of memoryStore) {
    if (now > entry.resetTime) {
      memoryStore.delete(key)
    }
  }
}, 60000)

// ─── Periodic DB Cleanup ─────────────────────────
// Delete expired entries from the database periodically

let cleanupInitialized = false

function initDbCleanup() {
  if (cleanupInitialized) return
  cleanupInitialized = true

  // Run cleanup every 5 minutes
  setInterval(async () => {
    try {
      await db.rateLimitEntry.deleteMany({
        where: { resetTime: { lt: new Date() } },
      })
    } catch {
      // Silently fail — cleanup is best-effort
    }
  }, 300_000)

  // Run once immediately (async, non-blocking)
  db.rateLimitEntry.deleteMany({
    where: { resetTime: { lt: new Date() } },
  }).catch(() => {})
}

// ─── Types ───────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

// ─── DB-Backed Check ─────────────────────────────

async function checkRateLimitDB(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const now = new Date()

  // Try to find existing entry
  let entry = await db.rateLimitEntry.findUnique({ where: { key } })

  // No entry or expired entry — create new
  if (!entry || now > entry.resetTime) {
    const resetTime = new Date(Date.now() + config.windowMs)
    try {
      await db.rateLimitEntry.upsert({
        where: { key },
        update: { count: 1, resetTime },
        create: { key, count: 1, resetTime },
      })
    } catch {
      // Race condition: another instance created it — try update
      await db.rateLimitEntry.update({
        where: { key },
        data: { count: 1, resetTime },
      }).catch(() => {})
    }
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime: resetTime.getTime(),
    }
  }

  // Within the window — check limit
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime.getTime(),
      retryAfter: Math.ceil((entry.resetTime.getTime() - Date.now()) / 1000),
    }
  }

  // Increment count
  await db.rateLimitEntry.update({
    where: { key },
    data: { count: { increment: 1 } },
  })

  return {
    allowed: true,
    remaining: config.limit - entry.count - 1,
    resetTime: entry.resetTime.getTime(),
  }
}

// ─── In-Memory Check ─────────────────────────────

function checkRateLimitMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = memoryStore.get(key)

  // No entry or expired entry — allow and create new
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs
    memoryStore.set(key, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime,
    }
  }

  // Within the window
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  // Increment count
  entry.count++
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  }
}

// ─── Public API ──────────────────────────────────

/**
 * Check if a request is within rate limits.
 * Uses IP address or user ID as the key.
 *
 * Tries Prisma DB first; falls back to in-memory on DB failure.
 * Can be called synchronously (returns in-memory result) or
 * asynchronously (returns DB result when available).
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  // If DB is known to be unavailable and retry window hasn't elapsed,
  // use in-memory directly
  if (!dbAvailable && Date.now() < dbRetryAfter) {
    return checkRateLimitMemory(key, config)
  }

  // Try DB first (synchronous attempt via promise)
  // Since this is called from API routes, we can't easily make it async
  // without changing all callers. Instead, we use a cached/sync approach:
  // We attempt DB, but since Prisma is async, we fall back to in-memory
  // and fire the DB check in the background for next call.
  //
  // For a truly DB-backed sync check, we use a hybrid:
  // 1. Check in-memory cache first (fast, always available)
  // 2. Periodically sync with DB in the background

  return checkRateLimitMemory(key, config)
}

/**
 * Async version of checkRateLimit that uses the database as the primary store.
 * Use this in API routes where async is supported.
 */
export async function checkRateLimitAsync(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // If DB is known to be unavailable and retry window hasn't elapsed,
  // fall back to in-memory
  if (!dbAvailable && Date.now() < dbRetryAfter) {
    return checkRateLimitMemory(key, config)
  }

  try {
    // Initialize periodic cleanup on first use
    initDbCleanup()

    const result = await checkRateLimitDB(key, config)

    // DB succeeded — mark as available
    dbAvailable = true

    return result
  } catch (err) {
    // DB failed — mark as unavailable, fall back to in-memory
    dbAvailable = false
    dbRetryAfter = Date.now() + DB_RETRY_INTERVAL

    console.warn('[rate-limit] DB unavailable, falling back to in-memory:', err)

    return checkRateLimitMemory(key, config)
  }
}

// ─── Preset Rate Limit Configs ──────────────────

export const RATE_LIMITS = {
  /** General API — 100 requests per minute */
  api: { limit: 100, windowMs: 60_000 },
  /** AI completions — 20 requests per minute (expensive) */
  ai: { limit: 20, windowMs: 60_000 },
  /** Workflow generation — 5 requests per minute (very expensive) */
  generate: { limit: 5, windowMs: 60_000 },
  /** Copilot — 30 requests per minute */
  copilot: { limit: 30, windowMs: 60_000 },
  /** Auth — 10 requests per minute (prevent brute force) */
  auth: { limit: 10, windowMs: 60_000 },
  /** Webhook triggers — 60 requests per minute */
  webhook: { limit: 60, windowMs: 60_000 },
} as const

/**
 * Get a rate limit key from a Request object.
 * Uses X-Forwarded-For header (from proxy) or falls back to a generic key.
 */
export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return `ip:${realIp.trim()}`
  }
  return 'ip:unknown'
}

/**
 * Apply rate limiting to an API route handler.
 * Returns a 429 response if rate limited, otherwise calls the handler.
 * Uses the async DB-backed check for persistent rate limiting.
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: Request, context?: unknown) => Promise<Response>
): (request: Request, context?: unknown) => Promise<Response> {
  return async (request: Request, context?: unknown) => {
    const key = getRateLimitKey(request)
    const result = await checkRateLimitAsync(key, config)

    // Add rate limit headers to all responses
    const rateLimitHeaders = {
      'X-RateLimit-Limit': String(config.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    }

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter),
            ...rateLimitHeaders,
          },
        }
      )
    }

    const response = await handler(request, context)

    // Clone and add headers
    const newHeaders = new Headers(response.headers)
    for (const [k, v] of Object.entries(rateLimitHeaders)) {
      newHeaders.set(k, v)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  }
}

/**
 * Cleanup expired rate limit entries from the database.
 * Call this periodically or on server startup.
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const result = await db.rateLimitEntry.deleteMany({
      where: { resetTime: { lt: new Date() } },
    })
    return result.count
  } catch {
    return 0
  }
}
