// ─── Trigger Logs API ──────────────────────────
// GET: Retrieve trigger logs with filtering and pagination

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// ─── GET /api/triggers/logs ─────────────────────

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const triggerType = url.searchParams.get('triggerType') // webhook, schedule, email
    const triggerId = url.searchParams.get('triggerId')
    const workflowId = url.searchParams.get('workflowId')
    const status = url.searchParams.get('status') // success, error
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    // Build where clause
    const where: Record<string, unknown> = {}
    if (triggerType) where.triggerType = triggerType
    if (triggerId) where.triggerId = triggerId
    if (workflowId) where.workflowId = workflowId
    if (status) where.status = status

    const [logs, total] = await Promise.all([
      db.triggerLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.triggerLog.count({ where }),
    ])

    const data = logs.map((log) => ({
      id: log.id,
      triggerType: log.triggerType,
      triggerId: log.triggerId,
      workflowId: log.workflowId,
      payload: log.payload,
      status: log.status,
      error: log.error,
      duration: log.duration,
      createdAt: log.createdAt.toISOString(),
    }))

    return successResponse({
      logs: data,
      total,
      limit,
      offset,
    })
  } catch (err) {
    console.error('[GET /api/triggers/logs]', err)
    return errorResponse('Failed to retrieve trigger logs', 500)
  }
}
