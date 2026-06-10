import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"
import { checkRateLimit, getRateLimitKey, RATE_LIMITS, type RateLimitConfig } from "@/lib/rate-limit"

// ─── Proxy (Next.js 16) ─────────────────────────────
// 1. Rate limiting (before auth — works even for unauthenticated requests)
// 2. Authentication checks (protects routes based on auth status)
// Uses getToken (JWT only) to avoid edge-runtime incompatible imports
// Gracefully skips auth if NEXTAUTH_SECRET is not set (demo mode)

async function handleRequest(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Rate Limiting (BEFORE auth) ──────────────────
  if (pathname.startsWith("/api/")) {
    let rateLimitConfig: RateLimitConfig = RATE_LIMITS.api // default: general API

    if (pathname.startsWith("/api/auth")) {
      rateLimitConfig = RATE_LIMITS.auth
    } else if (pathname.startsWith("/api/ai")) {
      rateLimitConfig = RATE_LIMITS.ai
    } else if (pathname.match(/^\/api\/triggers\/webhook\/[^/]+$/)) {
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
  const publicApiPrefixes = ["/api/auth", "/api/ai/completions"]
  if (publicApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // ─── Protected pages ───────────────────────────────
  const protectedPagePrefixes = ["/dashboard", "/memory"]
  if (protectedPagePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    return NextResponse.next()
  }

  // ─── Protected API routes ──────────────────────────
  const protectedApiPrefixes = [
    "/api/workflows",
    "/api/executions",
    "/api/memory",
    "/api/integrations",
    "/api/copilot",
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

// Keep middleware export for backward compatibility
export async function middleware(request: NextRequest) {
  return handleRequest(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)",
  ],
}
