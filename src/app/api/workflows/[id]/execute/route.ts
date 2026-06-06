import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// ─── POST /api/workflows/[id]/execute ──────────────
// Create an execution record for a workflow (stub)
// The actual execution happens client-side

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify workflow exists
    const workflow = await db.workflow.findUnique({
      where: { id },
      include: { nodes: true },
    })

    if (!workflow) {
      return errorResponse('Workflow not found', 404)
    }

    if (workflow.nodes.length === 0) {
      return errorResponse('Cannot execute a workflow with no nodes', 400)
    }

    // Parse optional input from request body
    let input: string | undefined
    try {
      const body = await request.json()
      if (body.input !== undefined) {
        input = JSON.stringify(body.input)
      }
    } catch {
      // Empty body is fine
    }

    // Generate a unique run ID
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    const execution = await db.execution.create({
      data: {
        workflowId: id,
        runId,
        status: 'running',
        triggeredBy: 'api',
        input,
        steps: '[]',
        totalDurationMs: 0,
        totalCostUsd: 0,
      },
    })

    return successResponse({
      runId: execution.runId,
      workflowId: execution.workflowId,
      status: execution.status,
      startedAt: execution.startedAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/workflows/[id]/execute]', err)
    return errorResponse('Failed to start execution', 500)
  }
}
