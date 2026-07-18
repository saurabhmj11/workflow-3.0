import { handlers } from "@/lib/auth"
import { NextResponse } from "next/server"

// ─── NextAuth.js v5 Route Handler ───────────────────
// Handles GET and POST requests for /api/auth/*

export const { GET, POST } = handlers

// Next.js Link prefetching sometimes sends HEAD requests.
// Auth.js doesn't natively support HEAD, which throws "UnknownAction" in the console.
// This empty HEAD handler prevents the error from cluttering the logs.
export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
