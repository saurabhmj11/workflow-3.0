import { NextRequest, NextResponse } from 'next/server'

// ─── Waitlist API ────────────────────────────────
// In production, this would save to a database or send to a CRM.
// For now, it logs the email and returns success.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Valid email is required' }, { status: 400 })
    }

    // In production: save to database, send to HubSpot/Intercom, trigger welcome email
    console.log(`[OpenWorkflow] Waitlist signup: ${email}`)

    return NextResponse.json({
      ok: true,
      data: { email, message: 'Added to waitlist' },
    })
  } catch (err) {
    console.error('[OpenWorkflow] Waitlist error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to process request' }, { status: 500 })
  }
}
