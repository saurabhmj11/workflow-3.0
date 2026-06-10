// ─── Webhook Registration API ───────────────────
// GET: List all registered webhook triggers
// POST: Register a new webhook trigger (generates unique URL + optional secret)

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit'
import crypto from 'crypto'

// ─── GET /api/triggers/webhook ──────────────────

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const triggers = await db.webhookTrigger.findMany({
      where: userId ? { workflow: { userId } } : undefined,
      include: {
        workflow: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const data = triggers.map((t) => ({
      id: t.id,
      workflowId: t.workflowId,
      workflowName: t.workflow.name,
      triggerId: t.triggerId,
      webhookUrl: `${baseUrl}/api/triggers/webhook/${t.triggerId}`,
      hasSecret: !!t.secret,
      description: t.description,
      isActive: t.isActive,
      lastTriggeredAt: t.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: t.triggerCount,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/triggers/webhook]', err)
    return errorResponse('Failed to list webhook triggers', 500)
  }
}

// ─── POST /api/triggers/webhook ─────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, description, generateSecret } = body

    if (!workflowId) {
      return errorResponse('workflowId is required', 400)
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

    // Generate a unique triggerId for the webhook URL
    const triggerId = `wh_${crypto.randomBytes(16).toString('hex')}`

    // Optionally generate an HMAC secret
    const secret = generateSecret ? crypto.randomBytes(32).toString('hex') : null

    const trigger = await db.webhookTrigger.create({
      data: {
        workflowId,
        triggerId,
        secret,
        description: description || null,
        isActive: true,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    // Audit log — fire-and-forget
    auditLog({
      userId: userId ?? undefined,
      action: AUDIT_ACTIONS.TRIGGER_CREATED,
      resource: 'trigger',
      resourceId: trigger.id,
      details: { triggerType: 'webhook', workflowId },
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse({
      id: trigger.id,
      workflowId: trigger.workflowId,
      triggerId: trigger.triggerId,
      webhookUrl: `${baseUrl}/api/triggers/webhook/${trigger.triggerId}`,
      secret: trigger.secret,
      description: trigger.description,
      isActive: trigger.isActive,
      createdAt: trigger.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/triggers/webhook]', err)
    return errorResponse('Failed to create webhook trigger', 500)
  }
}
