// ─── SSO Login API ────────────────────────────────
// GET /api/sso/login/[providerId]
// Initiate SSO login by redirecting to the Identity Provider

import { ssoProviderManager } from '@/lib/sso/provider'
import { errorResponse } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/sso/login/[providerId]
 * Initiates SSO login for the specified provider.
 * Redirects the user to the Identity Provider's login page.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params

    // Build callback URL from the request origin
    const url = new URL(req.url)
    const callbackUrl = `${url.origin}/api/sso/callback?providerId=${providerId}`

    // Get the redirect URL from the SSO provider
    const redirectUrl = await ssoProviderManager.initiateLogin(providerId, callbackUrl)

    // Redirect the user to the IdP
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to initiate SSO login'
    console.error('[GET /api/sso/login/[providerId]]', err)

    // Redirect to login page with error
    const url = new URL(req.url)
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent(message)}`
    )
  }
}
