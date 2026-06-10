// ─── Deployment Environments API ──────────────────
// GET: List all deployment environments
// POST: Create a new deployment environment

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { initializeEnvironments } from '@/lib/deployment'

// ─── GET /api/deployments/environments ─────────────

export async function GET() {
  try {
    // Ensure default environments exist
    await initializeEnvironments()

    const environments = await db.deploymentEnvironment.findMany({
      orderBy: { isDefault: 'desc' },
    })

    const data = environments.map((env) => ({
      id: env.id,
      name: env.name,
      slug: env.slug,
      description: env.description ?? undefined,
      color: env.color,
      isDefault: env.isDefault,
      requiresApproval: env.requiresApproval,
      createdAt: env.createdAt.toISOString(),
      updatedAt: env.updatedAt.toISOString(),
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/deployments/environments]', err)
    return errorResponse('Failed to fetch environments', 500)
  }
}

// ─── POST /api/deployments/environments ────────────

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()

    const { name, slug, description, color, requiresApproval } = body

    if (!name || !slug) {
      return errorResponse('name and slug are required', 400)
    }

    // Check for duplicate slug
    const existing = await db.deploymentEnvironment.findUnique({
      where: { slug },
    })
    if (existing) {
      return errorResponse(`Environment with slug "${slug}" already exists`, 409)
    }

    const env = await db.deploymentEnvironment.create({
      data: {
        name,
        slug,
        description: description ?? null,
        color: color ?? '#6B7280',
        requiresApproval: requiresApproval ?? false,
      },
    })

    return successResponse({
      id: env.id,
      name: env.name,
      slug: env.slug,
      description: env.description ?? undefined,
      color: env.color,
      isDefault: env.isDefault,
      requiresApproval: env.requiresApproval,
      createdAt: env.createdAt.toISOString(),
      updatedAt: env.updatedAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/deployments/environments]', err)
    return errorResponse('Failed to create environment', 500)
  }
}
