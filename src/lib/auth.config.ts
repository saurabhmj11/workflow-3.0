import type { NextAuthConfig } from "next-auth"

// This config is safe for the Edge runtime (no Prisma or Node.js modules)
export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [], // Configured in auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthRoute =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/api/sso")
        
      const isPublicRoute =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/demo") ||
        nextUrl.pathname.startsWith("/widget") ||
        nextUrl.pathname.startsWith("/embed") ||
        nextUrl.pathname.startsWith("/api/public") ||
        nextUrl.pathname.startsWith("/api/auth")

      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }
        return true
      }

      if (nextUrl.pathname === "/" && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      if (!isLoggedIn && !isPublicRoute) {
        return false // Redirects to login page
      }
      return true
    },
    // We need these here so Edge JWT token decoding preserves shape
    async jwt({ token, user }) {
      if (user && user.id) {
        token.userId = user.id
        // @ts-ignore - role is dynamically added
        token.role = user.role ?? "USER"
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        // @ts-ignore
        session.user.id = token.userId
        // @ts-ignore
        session.user.role = token.role
      }
      return session
    },
  },
} satisfies NextAuthConfig
