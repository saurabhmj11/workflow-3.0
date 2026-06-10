// ─── WhatsApp Webhook Handler (Meta Cloud API) ──
// GET  /api/triggers/whatsapp/webhook — Webhook verification
// POST /api/triggers/whatsapp/webhook — Handle incoming WhatsApp messages
//
// The GET endpoint handles Meta's webhook verification flow:
//   - hub.mode must be "subscribe"
//   - hub.verify_token must match the trigger's webhookVerifyToken
//   - Responds with hub.challenge value
//
// The POST endpoint handles incoming WhatsApp messages:
//   - Parses the Meta webhook payload
//   - Triggers the associated workflow
//   - Returns 200 OK to acknowledge receipt
//
// This is a public endpoint — no auth required since Meta calls it.

import { db } from '@/lib/db'

// ─── GET /api/triggers/whatsapp/webhook ─────────

/**
 * Handle Meta WhatsApp webhook verification.
 * Meta sends a GET request with hub.mode=subscribe, hub.verify_token, and hub.challenge.
 * If the verify token matches a trigger's webhookVerifyToken, respond with the challenge.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get('hub.mode')
    const verifyToken = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode !== 'subscribe') {
      return new Response('Forbidden', { status: 403 })
    }

    if (!verifyToken || !challenge) {
      return new Response('Bad Request: missing verify_token or challenge', { status: 400 })
    }

    // Look up the trigger by verify token
    const trigger = await db.whatsAppTrigger.findFirst({
      where: {
        webhookVerifyToken: verifyToken,
        isActive: true,
      },
      include: {
        workflow: { select: { id: true, isActive: true } },
      },
    })

    if (!trigger) {
      console.warn('[WhatsApp Webhook] Verification failed: no matching trigger for verify token')
      return new Response('Forbidden', { status: 403 })
    }

    if (!trigger.workflow.isActive) {
      console.warn('[WhatsApp Webhook] Verification failed: workflow is inactive')
      return new Response('Forbidden', { status: 403 })
    }

    console.log(`[WhatsApp Webhook] Verification successful for trigger ${trigger.triggerId}`)
    // Return the challenge value as plain text (Meta expects this)
    return new Response(challenge, { status: 200 })
  } catch (err) {
    console.error('[GET /api/triggers/whatsapp/webhook]', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}

// ─── POST /api/triggers/whatsapp/webhook ────────

/**
 * Handle incoming WhatsApp messages from Meta.
 * Parses the webhook payload, identifies the matching trigger by phone number ID,
 * and triggers the associated workflow.
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  let triggerId: string | undefined
  let workflowId: string | undefined

  try {
    const rawBody = await request.text()
    let payload: Record<string, unknown>

    try {
      payload = JSON.parse(rawBody)
    } catch {
      console.error('[WhatsApp Webhook] Failed to parse JSON payload')
      return new Response('Bad Request', { status: 400 })
    }

    // Meta WhatsApp webhook payload structure:
    // {
    //   "object": "whatsapp_business_account",
    //   "entry": [{
    //     "id": "...",
    //     "changes": [{
    //       "value": {
    //         "messaging_product": "whatsapp",
    //         "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
    //         "messages": [{ "from": "...", "id": "...", "text": { "body": "..." }, ... }]
    //       },
    //       "field": "messages"
    //     }]
    //   }]
    // }

    const object = payload.object as string | undefined
    if (object !== 'whatsapp_business_account') {
      // Not a WhatsApp event — acknowledge silently
      return new Response('OK', { status: 200 })
    }

    const entries = payload.entry as Array<Record<string, unknown>> | undefined
    if (!entries || !Array.isArray(entries)) {
      return new Response('OK', { status: 200 })
    }

    // Process each entry
    for (const entry of entries) {
      const changes = entry.changes as Array<Record<string, unknown>> | undefined
      if (!changes || !Array.isArray(changes)) continue

      for (const change of changes) {
        const value = change.value as Record<string, unknown> | undefined
        if (!value) continue

        const metadata = value.metadata as Record<string, unknown> | undefined
        const phoneNumberId = metadata?.phone_number_id as string | undefined

        // Look up trigger by phone number ID
        let trigger = phoneNumberId
          ? await db.whatsAppTrigger.findFirst({
              where: { phoneNumberId, isActive: true },
              include: { workflow: { select: { id: true, name: true, isActive: true } } },
            })
          : null

        // Fallback: if no trigger found by phoneNumberId, try to find any active trigger
        if (!trigger) {
          trigger = await db.whatsAppTrigger.findFirst({
            where: { isActive: true },
            include: { workflow: { select: { id: true, name: true, isActive: true } } },
            orderBy: { createdAt: 'desc' },
          })
        }

        if (!trigger || !trigger.workflow.isActive) {
          console.warn('[WhatsApp Webhook] No active trigger found for phone number ID:', phoneNumberId)
          continue
        }

        triggerId = trigger.triggerId
        workflowId = trigger.workflowId

        const messages = value.messages as Array<Record<string, unknown>> | undefined
        if (!messages || !Array.isArray(messages)) continue

        for (const message of messages) {
          const triggerPayload = {
            triggerType: 'whatsapp',
            triggerId: trigger.triggerId,
            workflowId: trigger.workflowId,
            timestamp: new Date().toISOString(),
            provider: trigger.provider,
            messageData: {
              messageId: message.id,
              from: message.from,
              type: message.type,
              text: (message.text as Record<string, unknown>)?.body || null,
              timestamp: message.timestamp,
              phoneNumberId: phoneNumberId || null,
              displayName: (message.profile as Record<string, unknown>)?.name || null,
            },
            rawPayload: value,
          }

          // Create execution record
          const runId = `run_wa_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

          await db.execution.create({
            data: {
              workflowId: trigger.workflowId,
              runId,
              status: 'running',
              triggeredBy: 'webhook',
              input: JSON.stringify(triggerPayload),
              steps: '[]',
              totalDurationMs: 0,
              totalCostUsd: 0,
            },
          })

          // Update trigger stats
          await db.whatsAppTrigger.update({
            where: { id: trigger.id },
            data: {
              lastTriggeredAt: new Date(),
              triggerCount: { increment: 1 },
            },
          })

          // Log successful trigger
          const duration = Date.now() - startTime
          await logTrigger('whatsapp', trigger.triggerId, trigger.workflowId, JSON.stringify(triggerPayload), 'success', undefined, duration)

          console.log(`[WhatsApp] Triggered workflow ${trigger.workflowId} via WhatsApp message, runId: ${runId}`)
        }
      }
    }

    // Meta expects a 200 OK to acknowledge receipt
    return new Response('OK', { status: 200 })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[POST /api/triggers/whatsapp/webhook]', err)

    if (triggerId && workflowId) {
      await logTrigger('whatsapp', triggerId, workflowId, '{}', 'error', error, Date.now() - startTime)
    }

    // Still return 200 to prevent Meta from retrying
    return new Response('OK', { status: 200 })
  }
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
        payload: payload.slice(0, 10000),
        status,
        error,
        duration,
      },
    })
  } catch (logErr) {
    console.error('[WhatsApp] Failed to write trigger log:', logErr)
  }
}
