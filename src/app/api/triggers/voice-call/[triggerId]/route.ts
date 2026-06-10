// ─── Voice Call Trigger Detail API ──────────────
// GET    /api/triggers/voice-call/[triggerId] — Get a specific voice call trigger
// PATCH  /api/triggers/voice-call/[triggerId] — Update a voice call trigger
// DELETE /api/triggers/voice-call/[triggerId] — Delete a voice call trigger

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

const VALID_PROVIDERS = ['twilio', 'vonage'] as const

// ─── GET /api/triggers/voice-call/[triggerId] ───

/**
 * Get a specific voice call trigger by its triggerId.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  try {
    const { triggerId } = await params

    const trigger = await db.voiceCallTrigger.findUnique({
      where: { triggerId },
      include: {
        workflow: { select: { id: true, name: true, isActive: true } },
      },
    })

    if (!trigger) return errorResponse('Voice call trigger not found', 404)

    const userId = await getCurrentUserId()
    if (userId && trigger.workflow.userId && trigger.workflow.userId !== userId) {
      return errorResponse('Voice call trigger not found', 404)
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    return successResponse({
      id: trigger.id,
      triggerId: trigger.triggerId,
      name: trigger.name,
      workflowId: trigger.workflowId,
      workflowName: trigger.workflow.name,
      provider: trigger.provider,
      phoneNumber: trigger.phoneNumber,
      webhookUrl: trigger.webhookUrl || `${baseUrl}/api/triggers/voice-call/webhook?triggerId=${trigger.triggerId}`,
      welcomeMessage: trigger.welcomeMessage,
      recordCall: trigger.recordCall,
      isActive: trigger.isActive,
      lastTriggeredAt: trigger.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: trigger.triggerCount,
      createdAt: trigger.createdAt.toISOString(),
      updatedAt: trigger.updatedAt.toISOString(),
    })
  } catch (err) {
    console.error('[GET /api/triggers/voice-call/[triggerId]]', err)
    return errorResponse('Failed to get voice call trigger', 500)
  }
}

// ─── PATCH /api/triggers/voice-call/[triggerId] ─

/**
 * Update a voice call trigger.
 * Supports updating name, provider, phoneNumber, welcomeMessage, recordCall, and isActive.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  try {
    const { triggerId } = await params

    const trigger = await db.voiceCallTrigger.findUnique({
      where: { triggerId },
      include: { workflow: { select: { userId: true } } },
    })

    if (!trigger) return errorResponse('Voice call trigger not found', 404)

    const userId = await getCurrentUserId()
    if (userId && trigger.workflow.userId && trigger.workflow.userId !== userId) {
      return errorResponse('Voice call trigger not found', 404)
    }

    const body = await request.json()
    const { name, provider, phoneNumber, welcomeMessage, recordCall, isActive } = body as {
      name?: string
      provider?: string
      phoneNumber?: string
      welcomeMessage?: string
      recordCall?: boolean
      isActive?: boolean
    }

    // Validate provider if provided
    if (provider && !VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
      return errorResponse(`Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`, 400)
    }

    const updated = await db.voiceCallTrigger.update({
      where: { triggerId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(provider !== undefined ? { provider } : {}),
        ...(phoneNumber !== undefined ? { phoneNumber: phoneNumber || null } : {}),
        ...(welcomeMessage !== undefined ? { welcomeMessage: welcomeMessage || null } : {}),
        ...(recordCall !== undefined ? { recordCall } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })

    return successResponse({
      id: updated.id,
      triggerId: updated.triggerId,
      name: updated.name,
      workflowId: updated.workflowId,
      provider: updated.provider,
      phoneNumber: updated.phoneNumber,
      webhookUrl: updated.webhookUrl,
      welcomeMessage: updated.welcomeMessage,
      recordCall: updated.recordCall,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (err) {
    console.error('[PATCH /api/triggers/voice-call/[triggerId]]', err)
    return errorResponse('Failed to update voice call trigger', 500)
  }
}

// ─── DELETE /api/triggers/voice-call/[triggerId] ─

/**
 * Delete a voice call trigger.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  try {
    const { triggerId } = await params

    const trigger = await db.voiceCallTrigger.findUnique({
      where: { triggerId },
      include: { workflow: { select: { userId: true } } },
    })

    if (!trigger) return errorResponse('Voice call trigger not found', 404)

    const userId = await getCurrentUserId()
    if (userId && trigger.workflow.userId && trigger.workflow.userId !== userId) {
      return errorResponse('Voice call trigger not found', 404)
    }

    await db.voiceCallTrigger.delete({ where: { triggerId } })

    return successResponse({ deleted: true, triggerId })
  } catch (err) {
    console.error('[DELETE /api/triggers/voice-call/[triggerId]]', err)
    return errorResponse('Failed to delete voice call trigger', 500)
  }
}
