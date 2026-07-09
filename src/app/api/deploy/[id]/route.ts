// ─── Deployment Detail API ────────────────────────
// GET: Get deployment details
// POST: Rollback a deployment

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { rollbackDeployment } from '@/lib/deployment'

// ─── GET /api/deploy/[id] ─────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const deployment = await db.deployment.findUnique({
      where: { id },
      include: {
        environment: true,
        workflow: { select: { id: true, name: true } },
      },
    })

    if (!deployment) {
      return errorResponse('Deployment not found', 404)
    }

    const data = {
      id: deployment.id,
      workflowId: deployment.workflowId,
      workflowName: deployment.workflow.name,
      environment: deployment.environment.slug,
      environmentId: deployment.environmentId,
      environmentName: deployment.environment.name,
      environmentColor: deployment.environment.color,
      version: deployment.version,
      snapshotId: deployment.snapshotId,
      status: deployment.status,
      deployedBy: deployment.deployedBy,
      deployedAt: deployment.deployedAt.toISOString(),
      promotedFrom: deployment.promotedFrom,
      rollbackData: deployment.rollbackData ? JSON.parse(deployment.rollbackData) : null,
      notes: deployment.notes,
      createdAt: deployment.createdAt.toISOString(),
      updatedAt: deployment.updatedAt.toISOString(),
    }

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/deploy/[id]]', err)
    return errorResponse('Failed to fetch deployment', 500)
  }
}

// ─── POST /api/deploy/[id] ────────────────────
// Rollback a deployment

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId()

    const body = await request.json()
    const { action } = body

    if (action !== 'rollback') {
      return errorResponse('Invalid action. Supported: rollback', 400)
    }

    const result = await rollbackDeployment(id, userId)

    return successResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rollback deployment'
    console.error('[POST /api/deploy/[id]]', err)
    return errorResponse(message, 400)
  }
}
