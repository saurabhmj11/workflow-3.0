// ─── Audit Log API ────────────────────────────────
// GET: Query audit logs with filtering and pagination
// Most recent first

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// ─── GET /api/audit ──────────────────────────────
// Query params: ?resource=workflow&action=workflow.created&userId=xxx&limit=50&offset=0

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const resource = url.searchParams.get('resource')
    const action = url.searchParams.get('action')
    const userId = url.searchParams.get('userId')
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 200)
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)

    // Build where clause from filters
    const where: Record<string, unknown> = {}
    if (resource) where.resource = resource
    if (action) where.action = action
    if (userId) where.userId = userId

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ])

    const data = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      resourceName: log.resourceName,
      status: log.status,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      details: log.details ? JSON.parse(log.details as string) : null,
      createdAt: log.createdAt.toISOString(),
    }))

    return successResponse({
      logs: data,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (err) {
    console.error('[GET /api/audit]', err)
    return errorResponse('Failed to fetch audit logs', 500)
  }
}
