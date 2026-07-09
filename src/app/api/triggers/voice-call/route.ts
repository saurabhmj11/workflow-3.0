// ─── Voice Call Trigger API ─────────────────────
// GET  /api/triggers/voice-call — List all voice call triggers
// POST /api/triggers/voice-call — Create a new voice call trigger

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import crypto from 'crypto'

const VALID_PROVIDERS = ['twilio', 'vonage'] as const
type VoiceCallProvider = (typeof VALID_PROVIDERS)[number]

// ─── GET /api/triggers/voice-call ───────────────

/**
 * List all voice call triggers for the current user.
 * Returns trigger details including provider, phone number, and webhook URL.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const triggers = await db.voiceCallTrigger.findMany({
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
      triggerId: t.triggerId,
      name: t.name,
      workflowId: t.workflowId,
      workflowName: t.workflow.name,
      provider: t.provider,
      phoneNumber: t.phoneNumber,
      webhookUrl: t.webhookUrl || `${baseUrl}/api/triggers/voice-call/webhook?triggerId=${t.triggerId}`,
      welcomeMessage: t.welcomeMessage,
      recordCall: t.recordCall,
      isActive: t.isActive,
      lastTriggeredAt: t.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: t.triggerCount,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/triggers/voice-call]', err)
    return errorResponse('Failed to list voice call triggers', 500)
  }
}

// ─── POST /api/triggers/voice-call ──────────────

/**
 * Create a new voice call trigger.
 * Validates the provider, generates a unique triggerId and webhook URL.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, name, provider, phoneNumber, welcomeMessage, recordCall } = body as {
      workflowId: string
      name?: string
      provider?: string
      phoneNumber?: string
      welcomeMessage?: string
      recordCall?: boolean
    }

    if (!workflowId) {
      return errorResponse('workflowId is required', 400)
    }

    // Validate provider
    const triggerProvider: VoiceCallProvider = VALID_PROVIDERS.includes(provider as VoiceCallProvider)
      ? (provider as VoiceCallProvider)
      : 'twilio'

    const userId = await getCurrentUserId()

    // Verify workflow exists and belongs to user
    const workflow = await db.workflow.findUnique({ where: { id: workflowId } })
    if (!workflow) return errorResponse('Workflow not found', 404)
    if (userId && workflow.userId && workflow.userId !== userId) return errorResponse('Workflow not found', 404)

    // Generate a unique triggerId
    const triggerId = `vc_${crypto.randomBytes(16).toString('hex')}`

    // Generate webhook URL for the voice provider
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const webhookUrl = `${baseUrl}/api/triggers/voice-call/webhook?triggerId=${triggerId}`

    const trigger = await db.voiceCallTrigger.create({
      data: {
        triggerId,
        name: name || 'Voice Call Trigger',
        workflowId,
        provider: triggerProvider,
        phoneNumber: phoneNumber || null,
        webhookUrl,
        welcomeMessage: welcomeMessage || null,
        recordCall: recordCall ?? false,
        isActive: true,
      },
    })

    return successResponse({
      id: trigger.id,
      triggerId: trigger.triggerId,
      name: trigger.name,
      workflowId: trigger.workflowId,
      provider: trigger.provider,
      phoneNumber: trigger.phoneNumber,
      webhookUrl: trigger.webhookUrl,
      welcomeMessage: trigger.welcomeMessage,
      recordCall: trigger.recordCall,
      isActive: trigger.isActive,
      createdAt: trigger.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/triggers/voice-call]', err)
    return errorResponse('Failed to create voice call trigger', 500)
  }
}
