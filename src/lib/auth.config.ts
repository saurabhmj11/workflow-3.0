import type { NextAuthConfig } from "next-auth"

// This config is safe for the Edge runtime (no Prisma or Node.js modules).
// NOTE: Middleware is now a passthrough — auth is enforced by the app router layouts
// and API routes directly. This config only governs callbacks/pages for NextAuth itself.
export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/register",
    error: "/login",
  },
  providers: [], // Configured in auth.ts
  callbacks: {
    // Used by middleware (NextAuth(authConfig).auth) - currently passthrough
    authorized({ auth, request: { nextUrl } }) {
      // Allow everything through - app layers handle auth enforcement
      return true
    },
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
        session.user.id = token.userId as string
        // @ts-ignore
        session.user.role = token.role as string
      }
      return session
    },
  },
} satisfies NextAuthConfig
