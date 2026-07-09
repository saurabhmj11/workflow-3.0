// ─── SSO Providers API ─────────────────────────────
// GET  — List all SSO providers
// POST — Create a new SSO provider

import { successResponse, errorResponse } from '@/lib/api-utils'
import { ssoProviderManager, type CreateSSOProviderData } from '@/lib/sso/provider'
import { requireAuth, isAdmin } from '@/lib/auth-utils'

const VALID_PROVIDERS = ['saml', 'oidc', 'okta', 'azure-ad', 'google-workspace']
const VALID_TYPES = ['saml', 'oidc']

/**
 * GET /api/sso/providers
 * List all configured SSO providers (masked secrets).
 */
export async function GET() {
  try {
    // Require auth to view providers
    try {
      await requireAuth()
    } catch {
      return errorResponse('Authentication required', 401)
    }

    const providers = await ssoProviderManager.getProviders()
    return successResponse({ providers })
  } catch (err) {
    console.error('[GET /api/sso/providers]', err)
    return errorResponse('Failed to fetch SSO providers', 500)
  }
}

/**
 * POST /api/sso/providers
 * Create a new SSO provider (admin only).
 */
export async function POST(request: Request) {
  try {
    // Require admin
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      try {
        await requireAuth()
        return errorResponse('Admin access required to configure SSO providers', 403)
      } catch {
        return errorResponse('Authentication required', 401)
      }
    }

    const body = await request.json()
    const {
      name,
      type,
      provider,
      enabled,
      samlEntryPoint,
      samlCertificate,
      samlIssuer,
      oidcDiscoveryUrl,
      oidcClientId,
      oidcClientSecret,
      allowedDomains,
      autoProvision,
      defaultRole,
      metadata,
    } = body as {
      name?: string
      type?: string
      provider?: string
      enabled?: boolean
      samlEntryPoint?: string
      samlCertificate?: string
      samlIssuer?: string
      oidcDiscoveryUrl?: string
      oidcClientId?: string
      oidcClientSecret?: string
      allowedDomains?: string[]
      autoProvision?: boolean
      defaultRole?: string
      metadata?: Record<string, unknown>
    }

    // Validate required fields
    if (!name) {
      return errorResponse('name is required', 400)
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return errorResponse(`type must be one of: ${VALID_TYPES.join(', ')}`, 400)
    }

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return errorResponse(`provider must be one of: ${VALID_PROVIDERS.join(', ')}`, 400)
    }

    // Validate SAML-specific fields
    if (type === 'saml') {
      if (!samlEntryPoint) {
        return errorResponse('samlEntryPoint is required for SAML providers', 400)
      }
    }

    // Validate OIDC-specific fields
    if (type === 'oidc') {
      if (!oidcDiscoveryUrl) {
        return errorResponse('oidcDiscoveryUrl is required for OIDC providers', 400)
      }
      if (!oidcClientId) {
        return errorResponse('oidcClientId is required for OIDC providers', 400)
      }
      if (!oidcClientSecret) {
        return errorResponse('oidcClientSecret is required for OIDC providers', 400)
      }
    }

    // Validate allowedDomains
    if (allowedDomains && !Array.isArray(allowedDomains)) {
      return errorResponse('allowedDomains must be an array of strings', 400)
    }

    // Validate defaultRole
    if (defaultRole && !['USER', 'ADMIN', 'VIEWER'].includes(defaultRole)) {
      return errorResponse('defaultRole must be one of: USER, ADMIN, VIEWER', 400)
    }

    const data: CreateSSOProviderData = {
      name,
      type: type as 'saml' | 'oidc',
      provider,
      enabled,
      samlEntryPoint,
      samlCertificate,
      samlIssuer,
      oidcDiscoveryUrl,
      oidcClientId,
      oidcClientSecret,
      allowedDomains,
      autoProvision,
      defaultRole,
      metadata,
    }

    const created = await ssoProviderManager.createProvider(data)

    return successResponse(created, 201)
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[POST /api/sso/providers]', err)
    return errorResponse('Failed to create SSO provider', 500)
  }
}
