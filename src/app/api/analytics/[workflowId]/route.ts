// ─── Per-Workflow Analytics API ───────────────────
// GET /api/analytics/[workflowId]
// Returns analytics for a specific workflow including:
// - Execution counts and success rates
// - Cost and duration averages
// - Node-level performance breakdown
// - Hourly timeline data

import { getWorkflowMetrics } from '@/lib/analytics'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('WorkflowAnalyticsAPI')

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params

    if (!workflowId) {
      return errorResponse('workflowId is required')
    }

    const metrics = await getWorkflowMetrics(workflowId)
    return successResponse(metrics)
  } catch (err) {
    log.error({ err }, 'Failed to fetch workflow analytics')
    return errorResponse('Failed to fetch workflow analytics', 500)
  }
}
