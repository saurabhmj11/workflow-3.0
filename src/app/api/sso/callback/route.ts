// ─── SSO Callback API ─────────────────────────────
// Handles SSO callback from Identity Providers.
// GET  — Handle OIDC callback (authorization code)
// POST — Handle SAML POST binding

import { ssoProviderManager } from '@/lib/sso/provider'
import { db } from '@/lib/db'
import { errorResponse } from '@/lib/api-utils'
import { createLogger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

const log = createLogger('SSOCallback')

/**
 * GET /api/sso/callback
 * Handle OIDC callback with authorization code.
 * The IdP redirects the user here after authentication.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const providerId = url.searchParams.get('providerId')
    const error = url.searchParams.get('error')

    // Check for IdP error
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || error
      log.error({ error, errorDescription }, 'OIDC callback error from IdP')
      return NextResponse.redirect(
        `${url.origin}/login?error=${encodeURIComponent(errorDescription)}`
      )
    }

    if (!code || !providerId) {
      return NextResponse.redirect(
        `${url.origin}/login?error=${encodeURIComponent('Missing authorization code or provider ID')}`
      )
    }

    // Validate the assertion/token from the provider
    const userInfo = await ssoProviderManager.validateAssertion(providerId, code)

    if (!userInfo || !userInfo.email) {
      return NextResponse.redirect(
        `${url.origin}/login?error=${encodeURIComponent('SSO authentication failed')}`
      )
    }

    // Check if the domain is allowed
    const domainAllowed = await ssoProviderManager.isDomainAllowed(userInfo.email)
    if (!domainAllowed) {
      return NextResponse.redirect(
        `${url.origin}/login?error=${encodeURIComponent('Your email domain is not allowed for SSO login')}`
      )
    }

    // Find or create the user (auto-provision)
    let user = await db.user.findUnique({
      where: { email: userInfo.email },
    })

    if (!user) {
      // Get the provider config for default role
      const provider = await ssoProviderManager.getProvider(providerId)

      if (provider?.autoProvision) {
        user = await db.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name || null,
            role: provider.defaultRole || 'USER',
          },
        })
        log.info({ email: userInfo.email, userId: user.id }, 'Auto-provisioned user via SSO')
      } else {
        return NextResponse.redirect(
          `${url.origin}/login?error=${encodeURIComponent('No account found. Contact your administrator.')}`
        )
      }
    }

    // In production, this would set a session/cookie via NextAuth
    // For now, redirect to the main app with a success indicator
    log.info({ email: userInfo.email, userId: user.id }, 'SSO login successful')

    // Redirect to dashboard with a success message
    return NextResponse.redirect(
      `${url.origin}/login?sso=success&email=${encodeURIComponent(userInfo.email)}`
    )
  } catch (err) {
    log.error({ err }, 'OIDC callback error')
    const url = new URL(req.url)
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent('SSO callback failed')}`
    )
  }
}

/**
 * POST /api/sso/callback
 * Handle SAML POST binding.
 * The IdP posts the SAML assertion here after authentication.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const samlResponse = formData.get('SAMLResponse') as string | null
    const relayState = formData.get('RelayState') as string | null

    if (!samlResponse) {
      return errorResponse('Missing SAMLResponse', 400)
    }

    // Extract providerId from RelayState
    let providerId: string | undefined
    if (relayState) {
      try {
        const state = JSON.parse(atob(relayState))
        providerId = state.providerId
      } catch {
        // RelayState might be just the providerId
        providerId = relayState
      }
    }

    if (!providerId) {
      return errorResponse('Missing provider ID in RelayState', 400)
    }

    // Validate the SAML assertion
    const userInfo = await ssoProviderManager.validateAssertion(providerId, samlResponse)

    if (!userInfo || !userInfo.email) {
      const url = new URL(req.url)
      return NextResponse.redirect(
        `${url.origin}/login?error=${encodeURIComponent('SAML authentication failed')}`
      )
    }

    // Check domain
    const domainAllowed = await ssoProviderManager.isDomainAllowed(userInfo.email)
    if (!domainAllowed) {
      const url = new URL(req.url)
      return NextResponse.redirect(
        `${url.origin}/login?error=${encodeURIComponent('Your email domain is not allowed for SSO login')}`
      )
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { email: userInfo.email },
    })

    if (!user) {
      const provider = await ssoProviderManager.getProvider(providerId)
      if (provider?.autoProvision) {
        user = await db.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name || null,
            role: provider.defaultRole || 'USER',
          },
        })
        log.info({ email: userInfo.email, userId: user.id }, 'Auto-provisioned user via SAML SSO')
      } else {
        const url = new URL(req.url)
        return NextResponse.redirect(
          `${url.origin}/login?error=${encodeURIComponent('No account found. Contact your administrator.')}`
        )
      }
    }

    log.info({ email: userInfo.email, userId: user.id }, 'SAML SSO login successful')

    // Redirect to the app
    const url = new URL(req.url)
    return NextResponse.redirect(
      `${url.origin}/login?sso=success&email=${encodeURIComponent(userInfo.email)}`
    )
  } catch (err) {
    log.error({ err }, 'SAML callback error')
    const url = new URL(req.url)
    return NextResponse.redirect(
      `${url.origin}/login?error=${encodeURIComponent('SAML callback failed')}`
    )
  }
}
