import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

/**
 * Middleware — runs on the Edge runtime.
 *
 * Uses getToken() directly instead of a separate NextAuth() instance.
 * Two separate NextAuth() instances (auth.ts and auth-edge.ts) produce
 * incompatible JWTs, causing an infinite /login redirect loop.
 * getToken() validates the session cookie with just the shared secret —
 * no full NextAuth instance required.
 */
export async function middleware(request: NextRequest) {
  const { nextUrl } = request

  // ── Fast-pass: NextAuth API routes & public API ──────────────────────
  if (nextUrl.pathname.startsWith("/api/auth")) return NextResponse.next()
  if (nextUrl.pathname.startsWith("/api/public")) return NextResponse.next()

  // ── Validate session JWT ─────────────────────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    // In Next.js 15+ on HTTPS the cookie is __Secure-authjs.session-token
    secureCookie: process.env.NODE_ENV === "production",
  })

  const isLoggedIn = !!token

  // ── Route classification ─────────────────────────────────────────────
  const isAuthRoute =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register") ||
    nextUrl.pathname.startsWith("/api/sso")

  const isPublicRoute =
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/demo") ||
    nextUrl.pathname.startsWith("/widget") ||
    nextUrl.pathname.startsWith("/embed")

  // ── Routing logic ────────────────────────────────────────────────────

  // Logged-in users don't need auth pages — send to dashboard
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // Auth pages are always accessible when not logged in
  if (isAuthRoute) return NextResponse.next()

  // Redirect logged-in users from root to dashboard
  if (nextUrl.pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // Unauthenticated access to protected routes
  if (!isLoggedIn && !isPublicRoute) {
    if (nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
