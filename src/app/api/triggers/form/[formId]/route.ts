// ─── Form Submission Handler ────────────────────
// POST /api/triggers/form/[formId] — Receives form submissions
// GET /api/triggers/form/[formId] — Returns the form schema/HTML

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

    const trigger = await db.formTrigger.findUnique({
      where: { formId },
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

    // Create an execution record for this form submission
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

    // Increment form submit count
    await db.formTrigger.update({
      where: { id: trigger.id },
      data: {
        submitCount: { increment: 1 },
        lastSubmittedAt: new Date(),
      },
    })

    // Log the trigger
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
        `<!DOCTYPE html><html><head><title>Thank You</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0f172a;}.card{text-align:center;padding:40px;background:#1e293b;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.3);color:#e2e8f0;}.title{font-size:24px;font-weight:600;margin-bottom:8px;}.subtitle{font-size:16px;color:#94a3b8;}</style></head><body><div class="card"><div style="font-size:48px;margin-bottom:16px;">✅</div><div class="title">Thank you!</div><div class="subtitle">Your submission has been received.</div></div></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    return successResponse({
      ok: true,
      runId,
      workflowId: trigger.workflowId,
      status: 'running',
      message: 'Form submission received and workflow triggered',
    })
  } catch (err) {
    console.error('[POST /api/triggers/form/[formId]]', err)
    return errorResponse('Failed to process form submission', 500)
  }
}

// ─── GET — Return form schema ──────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params

    const trigger = await db.formTrigger.findUnique({
      where: { formId },
      include: { workflow: { select: { name: true } } },
    })

    if (!trigger) {
      return errorResponse('Form not found', 404)
    }

    const fields = JSON.parse(trigger.fields)

    // Check if client wants JSON (API) or HTML (browser)
    const accept = request.headers.get('accept') || ''
    if (accept.includes('application/json')) {
      return successResponse({
        formId: trigger.formId,
        name: trigger.name,
        workflowName: trigger.workflow.name,
        fields,
        isActive: trigger.isActive,
        submitCount: trigger.submitCount,
        lastSubmittedAt: trigger.lastSubmittedAt?.toISOString() ?? null,
        createdAt: trigger.createdAt.toISOString(),
      })
    }

    // Return HTML page for browsers (fallback, main rendering is at /f/[formId])
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${trigger.name}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}.container{background:#1e293b;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.3);padding:32px;max-width:480px;width:100%;color:#e2e8f0}.title{font-size:24px;font-weight:600;margin-bottom:24px;text-align:center}.field{margin-bottom:16px}.field label{display:block;font-size:14px;font-weight:500;color:#94a3b8;margin-bottom:4px}.field input,.field textarea,.field select{width:100%;padding:10px 12px;background:#0f172a;border:1px solid #334155;border-radius:6px;font-size:16px;color:#e2e8f0}.field input:focus,.field textarea:focus,.field select:focus{outline:none;border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,0.15)}.field textarea{min-height:100px;resize:vertical}.submit-btn{width:100%;padding:12px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:white;border:none;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer;margin-top:8px}.submit-btn:hover{opacity:0.9}.branding{text-align:center;margin-top:16px;font-size:12px;color:#475569}</style></head><body><div class="container"><div class="title">${trigger.name}</div><form action="/api/triggers/form/${formId}" method="POST">${fields.map((f: { name: string; type: string; label: string; required?: boolean; placeholder?: string; options?: string[] }) => { if (f.type === 'textarea') return `<div class="field"><label for="${f.name}">${f.label}${f.required ? ' *' : ''}</label><textarea id="${f.name}" name="${f.name}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''}></textarea></div>`; if (f.type === 'select') return `<div class="field"><label for="${f.name}">${f.label}${f.required ? ' *' : ''}</label><select id="${f.name}" name="${f.name}" ${f.required ? 'required' : ''}><option value="">Select...</option>${(f.options || []).map((o: string) => `<option value="${o}">${o}</option>`).join('')}</select></div>`; return `<div class="field"><label for="${f.name}">${f.label}${f.required ? ' *' : ''}</label><input type="${f.type}" id="${f.name}" name="${f.name}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''}/></div>` }).join('')}<button type="submit" class="submit-btn">Submit</button></form><div class="branding">Powered by OpenWorkflow</div></div></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err) {
    console.error('[GET /api/triggers/form/[formId]]', err)
    return errorResponse('Failed to load form', 500)
  }
}
