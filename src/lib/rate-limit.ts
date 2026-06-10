// ─── Rate Limiting Utility ──────────────────────
// In-memory rate limiter using a sliding window approach.
// Used by API routes to prevent abuse.

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
}, 60000)

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

/**
 * Check if a request is within rate limits.
 * Uses IP address or user ID as the key.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  // No entry or expired entry — allow and create new
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs
    store.set(key, { count: 1, resetTime })
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
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (request: Request, context?: unknown) => Promise<Response>
): (request: Request, context?: unknown) => Promise<Response> {
  return async (request: Request, context?: unknown) => {
    const key = getRateLimitKey(request)
    const result = checkRateLimit(key, config)

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
