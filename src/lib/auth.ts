import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { db } from "@/lib/db"

// ─── Password verification ────────────────────────────────────────────────────
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
  // sha256:<salt>:<hash> format
  const parts = storedHash.split(":")
  if (parts.length !== 3) return false
  const [, salt, hash] = parts
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hash === hashHex
}

// ─── NextAuth v5 Configuration ───────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Pages
  pages: {
    signIn: "/login",
    newUser: "/register",
    error: "/login",
  },

  // Session strategy
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Required for production (Netlify)
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  debug: false,

  // Providers
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

        const email = (credentials.email as string).trim().toLowerCase()
        const password = credentials.password as string

        // ── Demo account (always available, no DB needed) ──
        if (email === "demo@openworkflow.ai" && password === "demo123") {
          return {
            id: "demo-user-id",
            email: "demo@openworkflow.ai",
            name: "Demo User",
            image: null,
            role: "USER",
          }
        }

        // ── Database lookup ────────────────────────────────
        try {
          const user = await db.user.findUnique({
            where: { email },
          })

          if (!user || !user.hashedPassword) {
            return null
          }

          const isValid = await verifyPassword(password, user.hashedPassword)

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
        } catch (err) {
          console.error("[authorize] DB error:", err)
          return null
        }
      },
    }),

    // GitHub OAuth — only enabled if env vars are set
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET })]
      : []),

    // Google OAuth — only enabled if env vars are set
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? [Google({ clientId: process.env.GOOGLE_ID, clientSecret: process.env.GOOGLE_SECRET })]
      : []),
  ],

  // Callbacks — defined ONCE, no spreads
  callbacks: {
    // JWT callback: embed user data into the token on sign-in
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id ?? ""
        token.role = (user as any).role ?? "USER"
        token.email = user.email ?? ""
        token.name = user.name ?? ""
      }
      return token
    },

    // Session callback: expose token data to useSession()
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },

    // signIn callback: create OAuth users in DB
    async signIn({ user, account }) {
      if (account?.provider === "github" || account?.provider === "google") {
        if (!user.email) return false
        try {
          const existing = await db.user.findUnique({ where: { email: user.email } })
          if (!existing) {
            await db.user.create({
              data: {
                email: user.email,
                name: user.name ?? null,
                image: user.image ?? null,
                role: "USER",
              },
            })
          }
        } catch {
          // Don't block OAuth sign-in on DB errors
        }
      }
      return true
    },

    // Redirect: always go to dashboard after login
    async redirect({ url, baseUrl }) {
      if (url === "/" || url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`
      }
      if (url.startsWith("/")) return `${baseUrl}${url}`
      try {
        if (new URL(url).origin === baseUrl) return url
      } catch {
        // Ignore invalid URLs
      }
      return `${baseUrl}/dashboard`
    },
  },
})

// ─── Type Augmentation ────────────────────────────────────────────────────────
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
