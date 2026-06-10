import { NextResponse } from "next/server"
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit'

// ─── POST /api/auth/register ───────────────────────
// Register a new user with email and password

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate required fields
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Hash the password using Web Crypto API
    const salt = crypto.randomUUID()
    const encoder = new TextEncoder()
    const data = encoder.encode(password + salt)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    const hashedPassword = `sha256:${salt}:${hashHex}`

    // Dynamic import of db to avoid compilation issues
    const { db } = await import("@/lib/db")

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Create the user
    const user = await db.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        hashedPassword,
        role: "USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // Audit log — fire-and-forget
    auditLog({
      userId: user.id,
      userEmail: user.email,
      action: AUDIT_ACTIONS.USER_REGISTERED,
      resource: 'user',
      resourceId: user.id,
      resourceName: user.email,
      ...getRequestMeta(request),
    }).catch(() => {})

    return NextResponse.json(
      {
        ok: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/auth/register]", err)
    return NextResponse.json(
      { ok: false, error: "Failed to create account" },
      { status: 500 }
    )
  }
}
