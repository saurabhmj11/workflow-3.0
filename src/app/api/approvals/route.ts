// ─── Approvals API ──────────────────────────────
// GET: List persistent approval records from DB
// POST: Create a new approval record (called by engine)
// PUT: Update approval status (approve/reject)

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit'

// ─── GET /api/approvals ─────────────────────────

export async function GET() {
  try {
    const approvals = await db.approvalRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const data = approvals.map((a) => ({
      id: a.id,
      runId: a.runId,
      nodeId: a.nodeId,
      workflowId: a.workflowId,
      assignee: a.assignee,
      status: a.status,
      context: a.context ? JSON.parse(a.context as string) : {},
      notes: a.notes,
      slaDeadline: a.slaDeadline?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/approvals]', err)
    return errorResponse('Failed to list approvals', 500)
  }
}

// ─── POST /api/approvals ────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, runId, nodeId, workflowId, assignee, status, context, slaDeadline } = body

    if (!id || !runId || !nodeId) {
      return errorResponse('id, runId, and nodeId are required', 400)
    }

    const record = await db.approvalRecord.create({
      data: {
        id,
        runId,
        nodeId,
        workflowId: workflowId || 'unknown',
        assignee: assignee || null,
        status: status || 'pending',
        context: context ? JSON.stringify(context) : '{}',
        slaDeadline: slaDeadline ? new Date(slaDeadline) : null,
      },
    })

    return successResponse({
      id: record.id,
      runId: record.runId,
      nodeId: record.nodeId,
      workflowId: record.workflowId,
      assignee: record.assignee,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/approvals]', err)
    return errorResponse('Failed to create approval', 500)
  }
}

// ─── PUT /api/approvals ─────────────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, status, notes } = body

    if (!id || !status) {
      return errorResponse('id and status are required', 400)
    }

    if (!['approved', 'rejected'].includes(status)) {
      return errorResponse('Status must be approved or rejected', 400)
    }

    const record = await db.approvalRecord.update({
      where: { id },
      data: {
        status,
        notes: notes || null,
        resolvedAt: new Date(),
      },
    })

    // Audit log — fire-and-forget
    auditLog({
      action: status === 'approved' ? AUDIT_ACTIONS.APPROVAL_APPROVED : AUDIT_ACTIONS.APPROVAL_REJECTED,
      resource: 'approval',
      resourceId: id,
      details: { status, notes },
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse({
      id: record.id,
      status: record.status,
      notes: record.notes,
      resolvedAt: record.resolvedAt?.toISOString() ?? null,
    })
  } catch (err) {
    console.error('[PUT /api/approvals]', err)
    return errorResponse('Failed to update approval', 500)
  }
}
