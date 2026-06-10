// ─── Deployment Promote API ───────────────────────
// POST: Promote a workflow from one environment to another

import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { promoteWorkflow } from '@/lib/deployment'

// ─── POST /api/deployments/promote ─────────────────

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()

    const { workflowId, fromEnv, toEnv, notes } = body

    if (!workflowId || !fromEnv || !toEnv) {
      return errorResponse('workflowId, fromEnv, and toEnv are required', 400)
    }

    const result = await promoteWorkflow(workflowId, fromEnv, toEnv, userId, notes)

    return successResponse(result, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to promote workflow'
    console.error('[POST /api/deployments/promote]', err)
    return errorResponse(message, 400)
  }
}
