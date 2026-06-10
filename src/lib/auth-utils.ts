import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── Auth Utilities ─────────────────────────────────
// Helpers for getting current user in API routes and middleware

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated (graceful demo mode).
 * Use this in API routes to scope queries to the logged-in user.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) return null

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: session.user.role ?? "USER",
    }
  } catch {
    // If auth fails (e.g., no NEXTAUTH_SECRET), return null for demo mode
    return null
  }
}

/**
 * Get the current user's ID for filtering queries.
 * Returns undefined if not authenticated (allows unfiltered queries in demo mode).
 */
export async function getCurrentUserId(): Promise<string | undefined> {
  const user = await getCurrentUser()
  return user?.id
}

/**
 * Require authentication — throws if not authenticated.
 * Use this for API routes that MUST have an authenticated user.
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthRequiredError()
  }
  return user
}

/**
 * Check if the current user has admin role
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === "ADMIN"
}

/**
 * Custom error for auth requirements
 */
export class AuthRequiredError extends Error {
  statusCode: number

  constructor(message = "Authentication required") {
    super(message)
    this.statusCode = 401
    this.name = "AuthRequiredError"
  }
}
