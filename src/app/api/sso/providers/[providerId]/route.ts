// ─── Single SSO Provider API ──────────────────────
// GET    — Get a specific SSO provider
// PUT    — Update an SSO provider (admin only)
// DELETE — Delete an SSO provider (admin only)

import { successResponse, errorResponse } from '@/lib/api-utils'
import { ssoProviderManager, type UpdateSSOProviderData } from '@/lib/sso/provider'
import { requireAuth, isAdmin } from '@/lib/auth-utils'
import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    await requireAuth()
  } catch {
    return errorResponse('Authentication required', 401)
  }

  try {
    const { providerId } = await params
    const provider = await ssoProviderManager.getProvider(providerId)

    if (!provider) {
      return errorResponse('Provider not found', 404)
    }

    return successResponse(provider)
  } catch (err) {
    console.error('[GET /api/sso/providers/[providerId]]', err)
    return errorResponse('Failed to fetch SSO provider', 500)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      try {
        await requireAuth()
        return errorResponse('Admin access required', 403)
      } catch {
        return errorResponse('Authentication required', 401)
      }
    }
  } catch {
    return errorResponse('Authentication required', 401)
  }

  try {
    const { providerId } = await params
    const body = await req.json()

    const {
      name,
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

    // Validate allowedDomains
    if (allowedDomains !== undefined && !Array.isArray(allowedDomains)) {
      return errorResponse('allowedDomains must be an array of strings', 400)
    }

    // Validate defaultRole
    if (defaultRole && !['USER', 'ADMIN', 'VIEWER'].includes(defaultRole)) {
      return errorResponse('defaultRole must be one of: USER, ADMIN, VIEWER', 400)
    }

    const data: UpdateSSOProviderData = {
      name,
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

    // Remove undefined fields
    for (const key of Object.keys(data)) {
      if ((data as Record<string, unknown>)[key] === undefined) {
        delete (data as Record<string, unknown>)[key]
      }
    }

    const updated = await ssoProviderManager.updateProvider(providerId, data)

    return successResponse(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update SSO provider'
    if (message === 'Provider not found') {
      return errorResponse(message, 404)
    }
    console.error('[PUT /api/sso/providers/[providerId]]', err)
    return errorResponse(message, 500)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      try {
        await requireAuth()
        return errorResponse('Admin access required', 403)
      } catch {
        return errorResponse('Authentication required', 401)
      }
    }
  } catch {
    return errorResponse('Authentication required', 401)
  }

  try {
    const { providerId } = await params
    await ssoProviderManager.deleteProvider(providerId)

    return successResponse({ deleted: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete SSO provider'
    if (message === 'Provider not found') {
      return errorResponse(message, 404)
    }
    console.error('[DELETE /api/sso/providers/[providerId]]', err)
    return errorResponse(message, 500)
  }
}
