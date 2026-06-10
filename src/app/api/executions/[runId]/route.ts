import { db } from '@/lib/db'
import { successResponse, errorResponse, serializeExecution } from '@/lib/api-utils'

// ─── GET /api/executions/[runId] ─────────────────────
// Fetch a single execution by runId with full details

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params

    const execution = await db.execution.findUnique({
      where: { runId },
      include: {
        workflow: { select: { name: true } },
      },
    })

    if (!execution) {
      return errorResponse('Execution not found', 404)
    }

    const serialized = serializeExecution(execution)

    // Parse steps for easier consumption
    return successResponse({
      ...serialized,
      errorSteps: serialized.steps.filter((s: { status: string }) => s.status === 'error'),
      successSteps: serialized.steps.filter((s: { status: string }) => s.status === 'success'),
      totalSteps: serialized.steps.length,
    })
  } catch (err) {
    console.error('[GET /api/executions/[runId]]', err)
    return errorResponse('Failed to fetch execution', 500)
  }
}
