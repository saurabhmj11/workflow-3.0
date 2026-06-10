// ─── Form Submission Handler ────────────────────
// POST /api/triggers/form/[formId] — Receives form submissions
// GET /api/triggers/form/[formId] — Returns the form HTML page

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// ─── POST — Submit form data ────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  const startTime = Date.now()

  try {
    const { formId } = await params

    const trigger = await db.webhookTrigger.findUnique({
      where: { triggerId: formId },
      include: { workflow: { select: { id: true, name: true, isActive: true } } },
    })

    if (!trigger) return errorResponse('Form not found', 404)
    if (!trigger.isActive) return errorResponse('This form is no longer accepting submissions', 400)
    if (!trigger.workflow.isActive) return errorResponse('Associated workflow is inactive', 400)

    // Parse form data
    let formData: Record<string, unknown> = {}
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      formData = await request.json()
    } else {
      // URL-encoded or multipart
      const fd = await request.formData()
      fd.forEach((value, key) => { formData[key] = value.toString() })
    }

    const triggerPayload = {
      triggerType: 'form',
      formId,
      workflowId: trigger.workflowId,
      timestamp: new Date().toISOString(),
      submission: formData,
    }

    const runId = `run_form_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    const workflow = await db.workflow.findUnique({
      where: { id: trigger.workflowId },
      include: { nodes: true },
    })

    if (!workflow || workflow.nodes.length === 0) {
      return errorResponse('Workflow has no nodes', 400)
    }

    await db.execution.create({
      data: {
        workflowId: trigger.workflowId,
        runId,
        status: 'running',
        triggeredBy: 'form',
        input: JSON.stringify(triggerPayload),
        steps: '[]',
        totalDurationMs: 0,
        totalCostUsd: 0,
      },
    })

    await db.webhookTrigger.update({
      where: { id: trigger.id },
      data: { lastTriggeredAt: new Date(), triggerCount: { increment: 1 } },
    })

    await db.triggerLog.create({
      data: {
        triggerType: 'form',
        triggerId: formId,
        workflowId: trigger.workflowId,
        payload: JSON.stringify(triggerPayload).slice(0, 10000),
        status: 'success',
        duration: Date.now() - startTime,
      },
    })

    // Return thank-you page for HTML form submissions
    const accept = request.headers.get('accept') || ''
    if (accept.includes('text/html')) {
      return new Response(
        `<!DOCTYPE html><html><head><title>Thank You</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb;}.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);}.title{font-size:24px;font-weight:600;color:#111827;margin-bottom:8px;}.subtitle{font-size:16px;color:#6b7280;}</style></head><body><div class="card"><div style="font-size:48px;margin-bottom:16px;">✅</div><div class="title">Thank you!</div><div class="subtitle">Your submission has been received.</div></div></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    return successResponse({ runId, workflowId: trigger.workflowId, status: 'running', message: 'Form submission received' })
  } catch (err) {
    console.error('[POST /api/triggers/form/[formId]]', err)
    return errorResponse('Failed to process form submission', 500)
  }
}

// ─── GET — Show form HTML page ──────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params

    const trigger = await db.webhookTrigger.findUnique({ where: { triggerId: formId } })

    if (!trigger) {
      return new Response('<!DOCTYPE html><html><body><h1>Form not found</h1></body></html>', {
        status: 404, headers: { 'Content-Type': 'text/html' },
      })
    }

    if (!trigger.isActive) {
      return new Response('<!DOCTYPE html><html><body><h1>This form is no longer accepting submissions</h1></body></html>', {
        status: 400, headers: { 'Content-Type': 'text/html' },
      })
    }

    const title = trigger.description?.replace('[FORM] ', '') || 'Contact Form'
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const actionUrl = `${baseUrl}/api/triggers/form/${formId}`

    const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}.form-container{background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);padding:32px;max-width:480px;width:100%}.form-title{font-size:24px;font-weight:600;color:#111827;margin-bottom:24px;text-align:center}.form-field{margin-bottom:16px}.form-field label{display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:4px}.form-field input,.form-field textarea{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:16px}.form-field input:focus,.form-field textarea:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,0.1)}.form-field textarea{min-height:100px;resize:vertical}.submit-btn{width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;border:none;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px}.submit-btn:hover{opacity:0.9}.branding{text-align:center;margin-top:16px;font-size:12px;color:#9ca3af}
</style></head><body><div class="form-container"><div class="form-title">${title}</div><form action="${actionUrl}" method="POST"><div class="form-field"><label for="name">Name *</label><input type="text" id="name" name="name" required/></div><div class="form-field"><label for="email">Email *</label><input type="email" id="email" name="email" required/></div><div class="form-field"><label for="message">Message *</label><textarea id="message" name="message" required></textarea></div><button type="submit" class="submit-btn">Submit</button></form><div class="branding">Powered by OpenWorkflow</div></div></body></html>`

    return new Response(html, { headers: { 'Content-Type': 'text/html' } })
  } catch (err) {
    console.error('[GET /api/triggers/form/[formId]]', err)
    return errorResponse('Failed to load form', 500)
  }
}
