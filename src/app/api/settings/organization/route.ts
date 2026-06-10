import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserId, requireAuth } from '@/lib/auth-utils'
import { successResponse, errorResponse } from '@/lib/api-utils'

interface OrgSettings {
  organizationName?: string
  timezone?: string
  defaultModel?: string
  organizationId?: string
}

const DEFAULT_ORG: OrgSettings = {
  organizationName: '',
  timezone: 'UTC',
  defaultModel: 'gpt-4o',
  organizationId: '',
}

// GET /api/settings/organization — Get organization settings from user metadata
export async function GET() {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return errorResponse('Authentication required', 401)

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, metadata: true },
    })

    if (!user) return errorResponse('User not found', 404)

    let metadata: Record<string, unknown> = {}
    if (user.metadata) {
      try {
        metadata = JSON.parse(user.metadata)
      } catch {
        metadata = {}
      }
    }

    const orgSettings: OrgSettings = {
      ...DEFAULT_ORG,
      ...(metadata.organization as OrgSettings | undefined),
      organizationId: `org_${userId.slice(0, 8)}`,
    }

    return successResponse(orgSettings)
  } catch (err) {
    console.error('[Settings/Organization] GET error:', err)
    return errorResponse('Failed to fetch organization settings', 500)
  }
}

// PUT /api/settings/organization — Update organization settings
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body: OrgSettings = await req.json()

    // Load existing metadata
    const existing = await db.user.findUnique({
      where: { id: user.id },
      select: { metadata: true },
    })

    let metadata: Record<string, unknown> = {}
    if (existing?.metadata) {
      try {
        metadata = JSON.parse(existing.metadata)
      } catch {
        metadata = {}
      }
    }

    // Merge organization settings
    metadata.organization = {
      organizationName: body.organizationName ?? '',
      timezone: body.timezone ?? 'UTC',
      defaultModel: body.defaultModel ?? 'gpt-4o',
    }

    await db.user.update({
      where: { id: user.id },
      data: { metadata: JSON.stringify(metadata) },
    })

    return successResponse({
      ...metadata.organization,
      organizationId: `org_${user.id.slice(0, 8)}`,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthRequiredError') {
      return errorResponse('Authentication required', 401)
    }
    console.error('[Settings/Organization] PUT error:', err)
    return errorResponse('Failed to update organization settings', 500)
  }
}
