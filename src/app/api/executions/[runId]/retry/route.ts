import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// ─── POST /api/executions/[runId]/retry ──────────────
// Retry a failed execution by creating a new run with the same input

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params

    // Find the original execution
    const execution = await db.execution.findUnique({
      where: { runId },
    })

    if (!execution) {
      return errorResponse('Execution not found', 404)
    }

    // Find the associated workflow with nodes and edges
    const workflow = await db.workflow.findUnique({
      where: { id: execution.workflowId },
      include: { nodes: true, edges: true },
    })

    if (!workflow) {
      return errorResponse('Workflow not found', 404)
    }

    // Create a new execution record for the retry
    const newRunId = `run_retry_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    await db.execution.create({
      data: {
        workflowId: workflow.id,
        runId: newRunId,
        status: 'running',
        triggeredBy: 'retry',
        input: execution.input,
        steps: '[]',
        totalDurationMs: 0,
        totalCostUsd: 0,
      },
    })

    return successResponse({
      runId: newRunId,
      workflowId: workflow.id,
      originalRunId: runId,
      input: execution.input ? JSON.parse(execution.input) : null,
      nodeCount: workflow.nodes.length,
      edgeCount: workflow.edges.length,
    })
  } catch (err) {
    console.error('[POST /api/executions/[runId]/retry]', err)
    return errorResponse('Failed to retry execution', 500)
  }
}
