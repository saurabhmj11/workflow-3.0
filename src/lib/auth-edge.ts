/**
 * Edge-safe auth configuration for Next.js middleware.
 *
 * The Edge runtime (where middleware runs) does NOT support Node.js APIs.
 * Prisma, bcryptjs, and Node.js crypto modules cannot be used here.
 *
 * This file re-exports only the JWT-based `auth` function needed for
 * session validation in middleware. All DB operations remain in the
 * full auth config at @/lib/auth.ts (Node.js runtime only).
 */
import NextAuth from "next-auth"

export const { auth } = NextAuth({
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days — must match auth.ts
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
})
