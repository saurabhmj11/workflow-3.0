// ─── Webhook Listener API ───────────────────────
// POST endpoint that receives external webhook payloads.
// Looks up the triggerId to find which workflow to execute.
// Validates webhook signature if a secret is configured.
// Triggers workflow execution with the webhook payload as input.
// Returns execution run ID and status.

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import crypto from 'crypto'

// ─── Verify HMAC-SHA256 Signature ──────────────

function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    // Support both "sha256=..." and raw hex formats
    const provided = signature.startsWith('sha256=') ? signature.slice(7) : signature
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  } catch {
    return false
  }
}

// ─── POST /api/triggers/webhook/[triggerId] ─────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  const startTime = Date.now()
  let triggerId: string | undefined
  let workflowId: string | undefined

  try {
    const { triggerId: tid } = await params
    triggerId = tid

    // Look up the webhook trigger
    const webhookTrigger = await db.webhookTrigger.findUnique({
      where: { triggerId: tid },
      include: {
        workflow: {
          select: { id: true, name: true, isActive: true },
        },
      },
    })

    if (!webhookTrigger) {
      return errorResponse('Webhook trigger not found', 404)
    }

    if (!webhookTrigger.isActive) {
      return errorResponse('Webhook trigger is inactive', 400)
    }

    if (!webhookTrigger.workflow.isActive) {
      return errorResponse('Associated workflow is inactive', 400)
    }

    workflowId = webhookTrigger.workflowId

    // Read the raw body for signature verification
    const rawBody = await request.text()

    // Validate signature if secret is configured
    if (webhookTrigger.secret) {
      const signature = request.headers.get('x-webhook-signature')
        || request.headers.get('x-hub-signature-256')
        || request.headers.get('x-signature')

      if (!signature) {
        // Log failed attempt
        await logTrigger('webhook', tid, webhookTrigger.workflowId, rawBody, 'error', 'Missing signature', Date.now() - startTime)
        return errorResponse('Webhook signature required', 401)
      }

      if (!verifySignature(rawBody, signature, webhookTrigger.secret)) {
        await logTrigger('webhook', tid, webhookTrigger.workflowId, rawBody, 'error', 'Invalid signature', Date.now() - startTime)
        return errorResponse('Invalid webhook signature', 401)
      }
    }

    // Parse the body
    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      // If not JSON, treat as plain text
      payload = { rawBody }
    }

    // Collect headers, query params, and body
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      if (!key.startsWith('x-middleware-') && key !== 'host') {
        headers[key] = value
      }
    })

    const url = new URL(request.url)
    const queryParams: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      if (key !== 'XTransformPort') {
        queryParams[key] = value
      }
    })

    const triggerPayload = {
      triggerType: 'webhook',
      webhookTriggerId: webhookTrigger.id,
      triggerId: tid,
      workflowId: webhookTrigger.workflowId,
      timestamp: new Date().toISOString(),
      headers,
      queryParams,
      body: payload,
    }

    // Create execution record
    const runId = `run_wh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    const workflow = await db.workflow.findUnique({
      where: { id: webhookTrigger.workflowId },
      include: { nodes: true },
    })

    if (!workflow || workflow.nodes.length === 0) {
      await logTrigger('webhook', tid, webhookTrigger.workflowId, rawBody, 'error', 'Workflow has no nodes', Date.now() - startTime)
      return errorResponse('Workflow has no nodes', 400)
    }

    await db.execution.create({
      data: {
        workflowId: webhookTrigger.workflowId,
        runId,
        status: 'running',
        triggeredBy: 'webhook',
        input: JSON.stringify(triggerPayload),
        steps: '[]',
        totalDurationMs: 0,
        totalCostUsd: 0,
      },
    })

    // Update webhook trigger stats
    await db.webhookTrigger.update({
      where: { id: webhookTrigger.id },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 },
      },
    })

    const duration = Date.now() - startTime

    // Log successful trigger
    await logTrigger('webhook', tid, webhookTrigger.workflowId, JSON.stringify(triggerPayload), 'success', undefined, duration)

    console.log(`[Webhook] Triggered workflow ${webhookTrigger.workflowId} via webhook ${tid}, runId: ${runId}`)

    return successResponse({
      runId,
      workflowId: webhookTrigger.workflowId,
      status: 'running',
      message: 'Workflow execution started',
    }, 200)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[POST /api/triggers/webhook/[triggerId]]', err)

    // Log the error
    if (triggerId && workflowId) {
      await logTrigger('webhook', triggerId, workflowId, '{}', 'error', error, Date.now() - startTime)
    }

    return errorResponse('Failed to process webhook', 500)
  }
}

// ─── Also support GET for webhook verification ──

export async function GET(
  request: Request,
  { params }: { params: Promise<{ triggerId: string }> }
) {
  const { triggerId: tid } = await params

  const webhookTrigger = await db.webhookTrigger.findUnique({
    where: { triggerId: tid },
    select: { id: true, triggerId: true, isActive: true, description: true },
  })

  if (!webhookTrigger) {
    return errorResponse('Webhook trigger not found', 404)
  }

  // Some webhook providers (e.g., Slack) send a challenge on registration
  const url = new URL(request.url)
  const challenge = url.searchParams.get('challenge')
  if (challenge) {
    return new Response(JSON.stringify({ challenge }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return successResponse({
    triggerId: webhookTrigger.triggerId,
    isActive: webhookTrigger.isActive,
    description: webhookTrigger.description,
  })
}

// ─── Helper: Log trigger ────────────────────────

async function logTrigger(
  triggerType: string,
  triggerId: string,
  workflowId: string,
  payload: string,
  status: string,
  error?: string,
  duration?: number
): Promise<void> {
  try {
    await db.triggerLog.create({
      data: {
        triggerType,
        triggerId,
        workflowId,
        payload: payload.slice(0, 10000), // Cap payload size
        status,
        error,
        duration,
      },
    })
  } catch (logErr) {
    console.error('[Webhook] Failed to write trigger log:', logErr)
  }
}
