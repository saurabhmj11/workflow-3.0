// ─── Twilio Voice Call Webhook Handler ──────────
// POST /api/triggers/voice-call/webhook — Handle incoming Twilio voice calls
//
// This endpoint is called by Twilio (or other voice providers) when
// an inbound call is received. It validates the provider signature,
// triggers the associated workflow, and returns a TwiML response.
//
// This is a public endpoint — no auth required since external services call it.

import { db } from '@/lib/db'
import crypto from 'crypto'

// ─── Twilio Signature Validation ────────────────

/**
 * Validate Twilio webhook signature using HMAC-SHA1.
 * Twilio sends an X-Twilio-Signature header which is a Base64-encoded
 * HMAC-SHA1 of the URL + sorted POST parameters using the auth token as key.
 *
 * @param url - The full URL of the webhook endpoint
 * @param params - The POST parameters from Twilio
 * @param signature - The X-Twilio-Signature header value
 * @param authToken - The Twilio Auth Token
 * @returns Whether the signature is valid
 */
function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  try {
    // Build the data string: URL + sorted params
    let data = url
    const sortedKeys = Object.keys(params).sort()
    for (const key of sortedKeys) {
      data += key + params[key]
    }

    // Compute HMAC-SHA1
    const expected = crypto
      .createHmac('sha1', authToken)
      .update(data)
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}

// ─── Generate TwiML Response ────────────────────

/**
 * Generate a TwiML response for the voice call.
 * Plays a welcome message and optionally records the call.
 *
 * @param welcomeMessage - TTS message to play when call connects
 * @param recordCall - Whether to record the call
 * @param webhookUrl - URL for recording status callbacks
 * @returns TwiML XML string
 */
function generateTwiML(welcomeMessage: string | null, recordCall: boolean, webhookUrl: string): string {
  const message = welcomeMessage || 'Thank you for calling. Your call is being processed.'
  const recordAttr = recordCall
    ? `<Record action="${webhookUrl}&amp;event=record" maxLength="120" transcribe="true" transcribeCallback="${webhookUrl}&amp;event=transcribe"/>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(message)}</Say>
  ${recordAttr}
  <Hangup/>
</Response>`
}

/**
 * Escape special XML characters in a string.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ─── POST /api/triggers/voice-call/webhook ──────

/**
 * Handle incoming voice call webhook from Twilio/Vonage.
 * Validates the provider signature, triggers the associated workflow,
 * and returns TwiML response.
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  let triggerId: string | undefined
  let workflowId: string | undefined

  try {
    const url = new URL(request.url)
    triggerId = url.searchParams.get('triggerId') ?? undefined

    if (!triggerId) {
      return new Response(generateTwiML('Error: No trigger identifier provided.', false, ''), {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Look up the voice call trigger
    const voiceTrigger = await db.voiceCallTrigger.findUnique({
      where: { triggerId },
      include: {
        workflow: { select: { id: true, name: true, isActive: true } },
      },
    })

    if (!voiceTrigger) {
      return new Response(generateTwiML('Error: Voice trigger not found.', false, ''), {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    if (!voiceTrigger.isActive) {
      return new Response(generateTwiML('This voice line is currently inactive.', false, ''), {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    if (!voiceTrigger.workflow.isActive) {
      return new Response(generateTwiML('The associated workflow is currently inactive.', false, ''), {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    workflowId = voiceTrigger.workflowId

    // Parse the form data from Twilio (x-www-form-urlencoded)
    const formData = await request.formData()
    const callData: Record<string, string> = {}
    formData.forEach((value, key) => {
      callData[key] = value.toString()
    })

    // Validate Twilio signature if TWILIO_AUTH_TOKEN is configured
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    if (voiceTrigger.provider === 'twilio' && twilioAuthToken) {
      const signature = request.headers.get('x-twilio-signature')
      if (signature) {
        const fullUrl = request.url
        if (!validateTwilioSignature(fullUrl, callData, signature, twilioAuthToken)) {
          await logTrigger('voice-call', triggerId, voiceTrigger.workflowId, JSON.stringify(callData), 'error', 'Invalid Twilio signature', Date.now() - startTime)
          return new Response(generateTwiML('Error: Authentication failed.', false, ''), {
            status: 403,
            headers: { 'Content-Type': 'text/xml' },
          })
        }
      }
    }

    // Build the trigger payload
    const triggerPayload = {
      triggerType: 'voice-call',
      triggerId,
      workflowId: voiceTrigger.workflowId,
      timestamp: new Date().toISOString(),
      provider: voiceTrigger.provider,
      callData: {
        callSid: callData.CallSid,
        from: callData.From,
        to: callData.To,
        callStatus: callData.CallStatus,
        direction: callData.Direction,
        callerName: callData.CallerName || null,
        callDuration: callData.CallDuration || null,
        recordingUrl: callData.RecordingUrl || null,
        transcriptionText: callData.TranscriptionText || null,
      },
    }

    // Create execution record
    const runId = `run_vc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    await db.execution.create({
      data: {
        workflowId: voiceTrigger.workflowId,
        runId,
        status: 'running',
        triggeredBy: 'voice',
        input: JSON.stringify(triggerPayload),
        steps: '[]',
        totalDurationMs: 0,
        totalCostUsd: 0,
      },
    })

    // Update trigger stats
    await db.voiceCallTrigger.update({
      where: { id: voiceTrigger.id },
      data: {
        lastTriggeredAt: new Date(),
        triggerCount: { increment: 1 },
      },
    })

    // Log successful trigger
    const duration = Date.now() - startTime
    await logTrigger('voice-call', triggerId, voiceTrigger.workflowId, JSON.stringify(triggerPayload), 'success', undefined, duration)

    console.log(`[VoiceCall] Triggered workflow ${voiceTrigger.workflowId} via voice call ${triggerId}, runId: ${runId}`)

    // Return TwiML response
    const twiml = generateTwiML(voiceTrigger.welcomeMessage, voiceTrigger.recordCall, voiceTrigger.webhookUrl || request.url)
    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[POST /api/triggers/voice-call/webhook]', err)

    if (triggerId && workflowId) {
      await logTrigger('voice-call', triggerId, workflowId, '{}', 'error', error, Date.now() - startTime)
    }

    return new Response(generateTwiML('An error occurred processing your call.', false, ''), {
      status: 500,
      headers: { 'Content-Type': 'text/xml' },
    })
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
    console.error('[VoiceCall] Failed to write trigger log:', logErr)
  }
}
