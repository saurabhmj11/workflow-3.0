// ─── WhatsApp Trigger API ──────────────────────
// GET  /api/triggers/whatsapp — List all WhatsApp triggers
// POST /api/triggers/whatsapp — Create a new WhatsApp trigger

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import crypto from 'crypto'

const VALID_PROVIDERS = ['meta', 'twilio', '360dialog'] as const
type WhatsAppProvider = (typeof VALID_PROVIDERS)[number]

// ─── GET /api/triggers/whatsapp ─────────────────

/**
 * List all WhatsApp triggers for the current user.
 * Returns trigger details including provider, phone number ID, and webhook status.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const triggers = await db.whatsAppTrigger.findMany({
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
      triggerId: t.triggerId,
      name: t.name,
      workflowId: t.workflowId,
      workflowName: t.workflow.name,
      provider: t.provider,
      phoneNumberId: t.phoneNumberId,
      hasVerifyToken: !!t.webhookVerifyToken,
      isActive: t.isActive,
      lastTriggeredAt: t.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: t.triggerCount,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/triggers/whatsapp]', err)
    return errorResponse('Failed to list WhatsApp triggers', 500)
  }
}

// ─── POST /api/triggers/whatsapp ────────────────

/**
 * Create a new WhatsApp trigger.
 * Validates the provider, generates a unique triggerId and webhook verify token.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, name, provider, phoneNumberId, webhookVerifyToken } = body as {
      workflowId: string
      name?: string
      provider?: string
      phoneNumberId?: string
      webhookVerifyToken?: string
    }

    if (!workflowId) {
      return errorResponse('workflowId is required', 400)
    }

    // Validate provider
    const triggerProvider: WhatsAppProvider = VALID_PROVIDERS.includes(provider as WhatsAppProvider)
      ? (provider as WhatsAppProvider)
      : 'meta'

    const userId = await getCurrentUserId()

    // Verify workflow exists and belongs to user
    const workflow = await db.workflow.findUnique({ where: { id: workflowId } })
    if (!workflow) return errorResponse('Workflow not found', 404)
    if (userId && workflow.userId && workflow.userId !== userId) return errorResponse('Workflow not found', 404)

    // Generate a unique triggerId
    const triggerId = `wa_${crypto.randomBytes(16).toString('hex')}`

    // Generate a webhook verify token if not provided
    const verifyToken = webhookVerifyToken || `vt_${crypto.randomBytes(16).toString('hex')}`

    const trigger = await db.whatsAppTrigger.create({
      data: {
        triggerId,
        name: name || 'WhatsApp Trigger',
        workflowId,
        provider: triggerProvider,
        phoneNumberId: phoneNumberId || null,
        webhookVerifyToken: verifyToken,
        isActive: true,
      },
    })

    return successResponse({
      id: trigger.id,
      triggerId: trigger.triggerId,
      name: trigger.name,
      workflowId: trigger.workflowId,
      provider: trigger.provider,
      phoneNumberId: trigger.phoneNumberId,
      webhookVerifyToken: trigger.webhookVerifyToken,
      isActive: trigger.isActive,
      createdAt: trigger.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/triggers/whatsapp]', err)
    return errorResponse('Failed to create WhatsApp trigger', 500)
  }
}
