// ─── White-Label Configuration API ────────────────
// GET  — Get white-label configuration (public, for embed rendering)
// PUT  — Update white-label configuration (admin only)

import { successResponse, errorResponse } from '@/lib/api-utils'
import { whiteLabelManager, type WhiteLabelConfig } from '@/lib/whitelabel/config'
import { requireAuth, isAdmin } from '@/lib/auth-utils'

/**
 * GET /api/whitelabel/config
 * Returns the current white-label configuration.
 * This is a public endpoint used for embed rendering.
 * Sensitive fields (allowedOrigins) are included but not secret.
 */
export async function GET() {
  try {
    const config = await whiteLabelManager.getConfig()

    // Return the full config for public consumption
    // (No secrets in white-label config — it's meant to be client-visible)
    return successResponse(config)
  } catch (err) {
    console.error('[GET /api/whitelabel/config]', err)
    return errorResponse('Failed to fetch white-label configuration', 500)
  }
}

/**
 * PUT /api/whitelabel/config
 * Update the white-label configuration (admin only).
 */
export async function PUT(request: Request) {
  try {
    // Require admin for configuration changes
    const adminCheck = await isAdmin()
    if (!adminCheck) {
      try {
        await requireAuth()
        return errorResponse('Admin access required to update white-label configuration', 403)
      } catch {
        return errorResponse('Authentication required', 401)
      }
    }

    const body = await request.json() as Partial<WhiteLabelConfig>

    // Validate color formats if provided
    const hexPattern = /^#([0-9A-Fa-f]{3}){1,2}$/
    if (body.primaryColor && !hexPattern.test(body.primaryColor)) {
      return errorResponse('primaryColor must be a valid hex color (e.g., #7c3aed)', 400)
    }
    if (body.secondaryColor && !hexPattern.test(body.secondaryColor)) {
      return errorResponse('secondaryColor must be a valid hex color', 400)
    }
    if (body.accentColor && !hexPattern.test(body.accentColor)) {
      return errorResponse('accentColor must be a valid hex color', 400)
    }

    // Validate embed.allowedOrigins
    if (body.embed?.allowedOrigins) {
      if (!Array.isArray(body.embed.allowedOrigins)) {
        return errorResponse('embed.allowedOrigins must be an array', 400)
      }
      // Validate each origin format
      for (const origin of body.embed.allowedOrigins) {
        if (typeof origin !== 'string') {
          return errorResponse('Each allowed origin must be a string', 400)
        }
        // Allow wildcards and valid URLs
        if (origin !== '*' && !origin.startsWith('*.')) {
          try {
            new URL(origin)
          } catch {
            return errorResponse(`Invalid origin format: "${origin}". Must be a valid URL or wildcard (e.g., "*.example.com")`, 400)
          }
        }
      }
    }

    // Validate embed.theme
    if (body.embed?.theme && !['light', 'dark', 'system'].includes(body.embed.theme)) {
      return errorResponse('embed.theme must be one of: light, dark, system', 400)
    }

    // Validate enabledFeatures
    if (body.enabledFeatures) {
      const validFeatures: (keyof WhiteLabelConfig['enabledFeatures'])[] = [
        'aiNodes', 'humanInTheLoop', 'mcpSupport', 'memoryLayer',
        'customCode', 'multiAgent', 'pluginSystem',
      ]
      for (const key of Object.keys(body.enabledFeatures)) {
        if (!validFeatures.includes(key as keyof WhiteLabelConfig['enabledFeatures'])) {
          return errorResponse(`Unknown feature: "${key}"`, 400)
        }
        if (typeof body.enabledFeatures[key as keyof WhiteLabelConfig['enabledFeatures']] !== 'boolean') {
          return errorResponse(`Feature "${key}" must be a boolean`, 400)
        }
      }
    }

    const updated = await whiteLabelManager.updateConfig(body)

    return successResponse(updated)
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[PUT /api/whitelabel/config]', err)
    return errorResponse('Failed to update white-label configuration', 500)
  }
}
