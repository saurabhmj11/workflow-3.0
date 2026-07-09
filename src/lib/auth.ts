import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { db } from "@/lib/db"

// ─── Password verification using Web Crypto API ──────
// Compatible with both edge runtime and Node.js

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.startsWith("sha256:")) {
    // Legacy bcrypt hash — try bcryptjs
    try {
      const bcrypt = await import("bcryptjs")
      return bcrypt.compare(password, storedHash)
    } catch {
      return false
    }
  }
  const [, salt, hash] = storedHash.split(":")
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hash === hashHex
}

// ─── NextAuth.js v5 Configuration ───────────────────
// OpenWorkflow authentication with Credentials, GitHub, and Google providers
// Uses JWT session strategy for stateless auth

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.hashedPassword) {
          return null
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.hashedPassword
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
    // GitHub OAuth — only enabled if env vars are set
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHub({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
    // Google OAuth — only enabled if env vars are set
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in — add user info to token
      if (user && user.id) {
        token.userId = user.id
        token.role = (user as { role?: string }).role ?? "USER"
      }
      return token
    },
    async session({ session, token }) {
      // Forward token data to session
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
      }
      return session
    },
    async signIn({ user, account }) {
      // For OAuth providers, create user in DB if they don't exist
      if (account?.provider === "github" || account?.provider === "google") {
        if (!user.email) return false

        const existingUser = await db.user.findUnique({
          where: { email: user.email },
        })

        if (!existingUser) {
          await db.user.create({
            data: {
              email: user.email,
              name: user.name ?? null,
              image: user.image ?? null,
              role: "USER",
            },
          })
        }
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        if (url === '/') return `${baseUrl}/dashboard`
        return `${baseUrl}${url}`
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        if (url === baseUrl || url === `${baseUrl}/`) return `${baseUrl}/dashboard`
        return url
      }
      // Fallback
      return `${baseUrl}/dashboard`
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
})

// Type augmentation for NextAuth v5
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
    }
  }

  interface User {
    role?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    role: string
  }
}
