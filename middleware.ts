import { auth } from "@/lib/auth-edge"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { nextUrl } = req

  // Define route categories
  const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register') || nextUrl.pathname.startsWith('/api/sso')
  
  // Public routes that don't require authentication
  const isPublicRoute = 
    nextUrl.pathname === '/' ||
    nextUrl.pathname.startsWith('/demo') || 
    nextUrl.pathname.startsWith('/widget') ||
    nextUrl.pathname.startsWith('/embed')

  // Let NextAuth handle its own API routes
  if (nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Allow public API routes (e.g. embeddable widgets, public webhooks)
  if (nextUrl.pathname.startsWith('/api/public')) {
    return NextResponse.next()
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      // If already logged in, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
    return NextResponse.next()
  }

  // Redirect root to dashboard if logged in
  if (nextUrl.pathname === '/' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  if (!isLoggedIn && !isPublicRoute) {
    // Exclude basic api routes from redirecting to login page to avoid returning HTML for API requests
    if (nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Redirect to login page and append the original url as callbackUrl
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl))
  }

  return NextResponse.next()
})

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
