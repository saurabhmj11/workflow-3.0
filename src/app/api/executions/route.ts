import { db } from '@/lib/db'
import { successResponse, errorResponse, serializeExecution } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── GET /api/executions ───────────────────────────
// List recent executions with optional workflowId filter
// Scoped to current user's workflows if authenticated (multi-tenancy)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId') ?? undefined
    const status = searchParams.get('status') ?? undefined
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100)
    const userId = await getCurrentUserId()

    const executions = await db.execution.findMany({
      where: {
        ...(workflowId && { workflowId }),
        ...(status && { status }),
        ...(userId && { workflow: { userId } }),
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        workflow: { select: { name: true } },
      },
    })

    return successResponse(executions.map(serializeExecution))
  } catch (err) {
    console.error('[GET /api/executions]', err)
    return errorResponse('Failed to fetch executions', 500)
  }
}
