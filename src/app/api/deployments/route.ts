// ─── Deployments API ──────────────────────────────
// GET: List deployments (optionally filtered by workflowId, environmentId)
// POST: Deploy a workflow to an environment

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { deployWorkflow, getActiveDeployments } from '@/lib/deployment'

// ─── GET /api/deployments ──────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const environmentId = searchParams.get('environmentId')
    const active = searchParams.get('active')

    // If requesting active deployments for a workflow
    if (workflowId && active === 'true') {
      const activeDeployments = await getActiveDeployments(workflowId)
      return successResponse(activeDeployments)
    }

    // Build the where clause
    const where: Record<string, unknown> = {}
    if (workflowId) where.workflowId = workflowId
    if (environmentId) where.environmentId = environmentId

    const deployments = await db.deployment.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { deployedAt: 'desc' },
      take: 100,
      include: {
        environment: true,
        workflow: { select: { id: true, name: true } },
      },
    })

    const data = deployments.map((d) => ({
      id: d.id,
      workflowId: d.workflowId,
      workflowName: d.workflow.name,
      environment: d.environment.slug,
      environmentId: d.environmentId,
      environmentName: d.environment.name,
      environmentColor: d.environment.color,
      version: d.version,
      snapshotId: d.snapshotId,
      status: d.status,
      deployedBy: d.deployedBy,
      deployedAt: d.deployedAt.toISOString(),
      promotedFrom: d.promotedFrom,
      notes: d.notes,
      createdAt: d.createdAt.toISOString(),
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/deployments]', err)
    return errorResponse('Failed to fetch deployments', 500)
  }
}

// ─── POST /api/deployments ─────────────────────────

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()

    const { workflowId, environment, notes } = body

    if (!workflowId || !environment) {
      return errorResponse('workflowId and environment are required', 400)
    }

    const result = await deployWorkflow(workflowId, environment, userId, notes)

    return successResponse(result, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to deploy workflow'
    console.error('[POST /api/deployments]', err)
    return errorResponse(message, 400)
  }
}
