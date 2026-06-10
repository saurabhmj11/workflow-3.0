// ─── Schedule Trigger API ──────────────────────
// GET: List all scheduled triggers
// POST: Create a new schedule trigger
// PUT: Update a schedule (pause/resume, change cron)
// DELETE: Remove a schedule

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { addScheduleJob, removeScheduleJob } from '@/lib/scheduler'
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit'
import cron from 'node-cron'

// ─── GET /api/triggers/schedule ─────────────────

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const triggers = await db.scheduleTrigger.findMany({
      where: userId ? { workflow: { userId } } : undefined,
      include: {
        workflow: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = triggers.map((t) => ({
      id: t.id,
      workflowId: t.workflowId,
      workflowName: t.workflow.name,
      cronExpression: t.cronExpression,
      timezone: t.timezone,
      isActive: t.isActive,
      lastTriggeredAt: t.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: t.triggerCount,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/triggers/schedule]', err)
    return errorResponse('Failed to list schedule triggers', 500)
  }
}

// ─── POST /api/triggers/schedule ────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, cronExpression, timezone, isActive } = body

    if (!workflowId) {
      return errorResponse('workflowId is required', 400)
    }

    if (!cronExpression) {
      return errorResponse('cronExpression is required', 400)
    }

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      return errorResponse('Invalid cron expression. Use standard 5-field format: minute hour day month weekday', 400)
    }

    const userId = await getCurrentUserId()

    // Verify workflow exists
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
    })

    if (!workflow) {
      return errorResponse('Workflow not found', 404)
    }

    if (userId && workflow.userId && workflow.userId !== userId) {
      return errorResponse('Workflow not found', 404)
    }

    const trigger = await db.scheduleTrigger.create({
      data: {
        workflowId,
        cronExpression,
        timezone: timezone || 'UTC',
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    // If active and scheduler is running, add the job
    if (trigger.isActive && process.env.TRIGGERS_ENABLED === 'true') {
      addScheduleJob(trigger.id, trigger.workflowId, trigger.cronExpression, trigger.timezone)
    }

    // Audit log — fire-and-forget
    auditLog({
      userId: userId ?? undefined,
      action: AUDIT_ACTIONS.TRIGGER_CREATED,
      resource: 'trigger',
      resourceId: trigger.id,
      details: { triggerType: 'schedule', cronExpression, workflowId },
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse({
      id: trigger.id,
      workflowId: trigger.workflowId,
      cronExpression: trigger.cronExpression,
      timezone: trigger.timezone,
      isActive: trigger.isActive,
      createdAt: trigger.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/triggers/schedule]', err)
    return errorResponse('Failed to create schedule trigger', 500)
  }
}

// ─── PUT /api/triggers/schedule ─────────────────

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, cronExpression, timezone, isActive } = body

    if (!id) {
      return errorResponse('id is required', 400)
    }

    const existing = await db.scheduleTrigger.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Schedule trigger not found', 404)
    }

    // Validate cron expression if provided
    if (cronExpression && !cron.validate(cronExpression)) {
      return errorResponse('Invalid cron expression', 400)
    }

    // Remove the existing job from the scheduler
    removeScheduleJob(id)

    const updated = await db.scheduleTrigger.update({
      where: { id },
      data: {
        ...(cronExpression !== undefined && { cronExpression }),
        ...(timezone !== undefined && { timezone }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    // If still active, add the job back with updated settings
    if (updated.isActive && process.env.TRIGGERS_ENABLED === 'true') {
      addScheduleJob(updated.id, updated.workflowId, updated.cronExpression, updated.timezone)
    }

    return successResponse({
      id: updated.id,
      workflowId: updated.workflowId,
      cronExpression: updated.cronExpression,
      timezone: updated.timezone,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err) {
    console.error('[PUT /api/triggers/schedule]', err)
    return errorResponse('Failed to update schedule trigger', 500)
  }
}

// ─── DELETE /api/triggers/schedule ──────────────

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return errorResponse('id query parameter is required', 400)
    }

    const existing = await db.scheduleTrigger.findUnique({
      where: { id },
    })

    if (!existing) {
      return errorResponse('Schedule trigger not found', 404)
    }

    // Remove from scheduler
    removeScheduleJob(id)

    // Delete from database
    await db.scheduleTrigger.delete({
      where: { id },
    })

    // Audit log — fire-and-forget
    auditLog({
      action: AUDIT_ACTIONS.TRIGGER_DELETED,
      resource: 'trigger',
      resourceId: id,
      details: { triggerType: 'schedule' },
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse({ deleted: true, id })
  } catch (err) {
    console.error('[DELETE /api/triggers/schedule]', err)
    return errorResponse('Failed to delete schedule trigger', 500)
  }
}
