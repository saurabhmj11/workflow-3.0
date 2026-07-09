import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// ─── POST /api/executions/persist ────────────────
// Persist client-side execution results to the database.
// Called after a workflow run completes.

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { runId, status, steps, totalDurationMs, totalCostUsd, output, finishedAt } = body

    if (!runId || !status) {
      return errorResponse('runId and status are required', 400)
    }

    // Find the execution record by runId (created when execute API was called)
    const existing = await db.execution.findFirst({
      where: { runId },
    })

    if (existing) {
      // Update existing record
      await db.execution.update({
        where: { id: existing.id },
        data: {
          status,
          steps: JSON.stringify(steps ?? []),
          totalDurationMs: totalDurationMs ?? 0,
          totalCostUsd: totalCostUsd ?? 0,
          output: output ? JSON.stringify(output) : undefined,
          finishedAt: finishedAt ? new Date(finishedAt) : new Date(),
        },
      })
    } else {
      // Create a new execution record
      await db.execution.create({
        data: {
          runId,
          workflowId: 'wf-demo', // Default for client-side executions
          status,
          steps: JSON.stringify(steps ?? []),
          totalDurationMs: totalDurationMs ?? 0,
          totalCostUsd: totalCostUsd ?? 0,
          output: output ? JSON.stringify(output) : undefined,
          triggeredBy: 'api',
          finishedAt: finishedAt ? new Date(finishedAt) : new Date(),
        },
      })
    }

    return successResponse({ persisted: true, runId })
  } catch (err) {
    console.error('[POST /api/executions/persist]', err)
    return errorResponse('Failed to persist execution', 500)
  }
}
