// ─── WhatsApp Trigger Detail API ───────────────
// GET    /api/triggers/whatsapp/[triggerId] — Get a specific WhatsApp trigger
// DELETE /api/triggers/whatsapp/[triggerId] — Delete a WhatsApp trigger

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── GET /api/triggers/whatsapp/[triggerId] ─────

/**
 * Get a specific WhatsApp trigger by its triggerId.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  try {
    const { triggerId } = await params

    const trigger = await db.whatsAppTrigger.findUnique({
      where: { triggerId },
      include: {
        workflow: { select: { id: true, name: true, isActive: true, userId: true } },
      },
    })

    if (!trigger) return errorResponse('WhatsApp trigger not found', 404)

    const userId = await getCurrentUserId()
    if (userId && trigger.workflow.userId && trigger.workflow.userId !== userId) {
      return errorResponse('WhatsApp trigger not found', 404)
    }

    return successResponse({
      id: trigger.id,
      triggerId: trigger.triggerId,
      name: trigger.name,
      workflowId: trigger.workflowId,
      workflowName: trigger.workflow.name,
      provider: trigger.provider,
      phoneNumberId: trigger.phoneNumberId,
      hasVerifyToken: !!trigger.webhookVerifyToken,
      isActive: trigger.isActive,
      lastTriggeredAt: trigger.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: trigger.triggerCount,
      createdAt: trigger.createdAt.toISOString(),
      updatedAt: trigger.updatedAt.toISOString(),
    })
  } catch (err) {
    console.error('[GET /api/triggers/whatsapp/[triggerId]]', err)
    return errorResponse('Failed to get WhatsApp trigger', 500)
  }
}

// ─── DELETE /api/triggers/whatsapp/[triggerId] ──

/**
 * Delete a WhatsApp trigger.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  try {
    const { triggerId } = await params

    const trigger = await db.whatsAppTrigger.findUnique({
      where: { triggerId },
      include: { workflow: { select: { userId: true } } },
    })

    if (!trigger) return errorResponse('WhatsApp trigger not found', 404)

    const userId = await getCurrentUserId()
    if (userId && trigger.workflow.userId && trigger.workflow.userId !== userId) {
      return errorResponse('WhatsApp trigger not found', 404)
    }

    await db.whatsAppTrigger.delete({ where: { triggerId } })

    return successResponse({ deleted: true, triggerId })
  } catch (err) {
    console.error('[DELETE /api/triggers/whatsapp/[triggerId]]', err)
    return errorResponse('Failed to delete WhatsApp trigger', 500)
  }
}
