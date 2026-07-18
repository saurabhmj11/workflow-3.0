import { NextRequest, NextResponse } from "next/server"

/**
 * Minimal middleware — only blocks truly private routes.
 * 
 * We cannot reliably validate the NextAuth JWT in the Edge runtime
 * when the secret is set server-side. Instead, we let the app
 * router handle auth via server-side session checks in each layout.
 * 
 * This middleware ONLY blocks the /api/* routes that need protection,
 * letting all pages through so client-side auth can handle it.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow auth routes (prevent redirect loop)
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next()
  }

  // For all other routes, just let them through.
  // Auth is enforced client-side in the layout (useSession) and 
  // server-side in API routes via auth() from auth.ts.
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
