// ─── White-Label Embed Token API ──────────────────
// POST /api/whitelabel/token
// Generate an embed token (JWT-like) for iframe authentication.

import { successResponse, errorResponse } from '@/lib/api-utils'
import { requireAuth, isAdmin } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('WhiteLabelEmbedToken')

const VALID_PERMISSIONS = ['read', 'write', 'execute', 'admin']
const DEFAULT_EXPIRY_SECONDS = 3600 // 1 hour

interface TokenPayload {
  workflowId?: string
  expiresIn?: number
  permissions?: string[]
}

/**
 * POST /api/whitelabel/token
 * Generate an embed token for iframe authentication.
 *
 * Body: {
 *   workflowId?: string,
 *   expiresIn?: number (seconds, default 3600),
 *   permissions?: string[] (default: ['read'])
 * }
 *
 * Returns: { token: string, expiresAt: string }
 */
export async function POST(request: Request) {
  try {
    // Require admin for token generation
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      try {
        await requireAuth()
        return errorResponse('Admin access required to generate embed tokens', 403)
      } catch {
        return errorResponse('Authentication required', 401)
      }
    }

    const body = await request.json() as TokenPayload
    const {
      workflowId,
      expiresIn,
      permissions,
    } = body

    // Validate permissions
    if (permissions && !Array.isArray(permissions)) {
      return errorResponse('permissions must be an array', 400)
    }

    if (permissions) {
      for (const perm of permissions) {
        if (!VALID_PERMISSIONS.includes(perm)) {
          return errorResponse(`Invalid permission: "${perm}". Must be one of: ${VALID_PERMISSIONS.join(', ')}`, 400)
        }
      }
    }

    // Validate expiresIn
    const expirySeconds = expiresIn ?? DEFAULT_EXPIRY_SECONDS
    if (typeof expirySeconds !== 'number' || expirySeconds <= 0) {
      return errorResponse('expiresIn must be a positive number (seconds)', 400)
    }
    if (expirySeconds > 86400) {
      return errorResponse('expiresIn cannot exceed 86400 seconds (24 hours)', 400)
    }

    // Build the token data
    const expiresAt = Date.now() + (expirySeconds * 1000)
    const tokenData = {
      workflowId,
      permissions: permissions ?? ['read'],
      expiresAt,
    }

    // Generate a simple token using crypto
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Store token in DB for validation
    try {
      await db.siteConfig.create({
        data: {
          key: `embed_token:${token}`,
          value: JSON.stringify(tokenData),
        },
      })
    } catch (err) {
      log.error({ err }, 'Failed to store embed token in DB')
      return errorResponse('Failed to generate embed token', 500)
    }

    log.info({ workflowId, permissions: tokenData.permissions }, 'Embed token generated')

    return successResponse({
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresIn: expirySeconds,
      permissions: tokenData.permissions,
      workflowId,
    }, 201)
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[POST /api/whitelabel/token]', err)
    return errorResponse('Failed to generate embed token', 500)
  }
}
