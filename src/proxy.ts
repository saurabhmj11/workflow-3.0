import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

// ─── Inline Rate Limiting (Edge-compatible) ──────────
// Cannot import @/lib/rate-limit because it imports PrismaClient
// which is incompatible with the Edge Runtime that proxy.ts runs in.

interface RateLimitConfig {
  limit: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { limit: 100, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
  ai: { limit: 20, windowMs: 60_000 },
  webhook: { limit: 60, windowMs: 60_000 },
}

const memoryStore = new Map<string, RateLimitEntry>()

function checkRateLimit(key: string, config: RateLimitConfig) {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.limit - 1, resetTime: now + config.windowMs }
  }

  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  entry.count++
  return { allowed: true, remaining: config.limit - entry.count, resetTime: entry.resetTime }
}

function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return `ip:${forwarded.split(',')[0].trim()}`
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return `ip:${realIp.trim()}`
  return 'ip:unknown'
}

// ─── Proxy (Next.js 16) ─────────────────────────────
// 1. Rate limiting (before auth — works even for unauthenticated requests)
// 2. Authentication checks (protects routes based on auth status)
// Uses getToken (JWT only) to avoid edge-runtime incompatible imports
// Gracefully skips auth if NEXTAUTH_SECRET is not set (demo mode)

async function handleRequest(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Rate Limiting (BEFORE auth) ──────────────────
  if (pathname.startsWith("/api/")) {
    let rateLimitConfig: RateLimitConfig = RATE_LIMITS.api

    if (pathname.startsWith("/api/auth")) {
      rateLimitConfig = RATE_LIMITS.auth
    } else if (pathname.startsWith("/api/ai")) {
      rateLimitConfig = RATE_LIMITS.ai
    } else if (pathname.match(/^\/api\/triggers\/(webhook|voice-call|whatsapp|form|email)/)) {
      rateLimitConfig = RATE_LIMITS.webhook
    }

    const rateLimitKey = getRateLimitKey(request)
    const rateLimitResult = checkRateLimit(rateLimitKey, rateLimitConfig)

    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateLimitResult.retryAfter),
            "X-RateLimit-Limit": String(rateLimitConfig.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(Math.ceil(rateLimitResult.resetTime / 1000)),
          },
        }
      )
    }
  }

  // If no NEXTAUTH_SECRET is configured, skip all auth checks (demo mode)
  if (!process.env.NEXTAUTH_SECRET) {
    return NextResponse.next()
  }

  // ─── Public routes (always accessible) ──────────────
  const publicRoutes = ["/login", "/register", "/"]
  if (publicRoutes.includes(pathname)) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (token && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // ─── Public API routes (no auth required) ──────────
  // These are intentionally accessible without authentication:
  // - /api/auth: NextAuth.js endpoints (login, session, etc.)
  // - /api/waitlist: Public signup form
  // - /api/triggers/*: Webhook endpoints that external services call
  // - /api/sso/*: SSO callback endpoints
  // - /api/f/*: Public form submissions
  // - /api/health: Health check for monitoring
  const publicApiPrefixes = [
    "/api/auth",
    "/api/waitlist",
    "/api/health",
    "/api/sso",
    "/api/triggers/webhook",
    "/api/triggers/voice-call/webhook",
    "/api/triggers/whatsapp/webhook",
    "/api/triggers/form",
  ]
  if (publicApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // ─── Protected pages ───────────────────────────────
  const protectedPagePrefixes = [
    "/dashboard",
    "/memory",
    "/analytics",
    "/observability",
    "/settings",
    "/audit",
    "/deployments",
    "/testing",
    "/integrations",
    "/plugins",
  ]
  if (protectedPagePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.next()
  }

  // ─── Protected API routes ──────────────────────────
  // All management/api routes require authentication except
  // the explicitly public ones above
  const protectedApiPrefixes = [
    "/api/workflows",
    "/api/executions",
    "/api/memory",
    "/api/integrations",
    "/api/copilot",
    "/api/ai/completions",
    "/api/analytics",
    "/api/audit",
    "/api/deployments",
    "/api/notifications",
    "/api/settings",
    "/api/mcp",
    "/api/agents",
    "/api/approvals",
    "/api/plugins",
    "/api/whitelabel",
    "/api/collaboration",
    "/api/observability",
    "/api/testing",
    "/api/triggers/schedule",
    "/api/triggers/email",
    "/api/triggers/logs",
    "/api/triggers/webhook",   // Management endpoints (create/list)
    "/api/triggers/voice-call", // Management endpoints
    "/api/triggers/whatsapp",   // Management endpoints
  ]
  if (protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // ─── All other routes ──────────────────────────────
  return NextResponse.next()
}

// Next.js 16 proxy convention
export async function proxy(request: NextRequest) {
  return handleRequest(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)",
  ],
}
