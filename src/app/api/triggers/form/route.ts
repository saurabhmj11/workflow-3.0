// ─── Form Trigger API ───────────────────────────
// POST /api/triggers/form/[formId] — Receives form submissions
// GET /api/triggers/form — List form triggers
// POST /api/triggers/form — Create a form trigger

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import crypto from 'crypto'

// ─── GET /api/triggers/form ──────────────────────

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const forms = await db.webhookTrigger.findMany({
      where: {
        description: { startsWith: '[FORM]' },
        ...(userId ? { workflow: { userId } } : {}),
      },
      include: {
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const data = forms.map((f) => ({
      id: f.id,
      workflowId: f.workflowId,
      workflowName: f.workflow.name,
      formId: f.triggerId,
      formUrl: `${baseUrl}/api/triggers/form/${f.triggerId}`,
      title: f.description?.replace('[FORM] ', '') || 'Untitled Form',
      isActive: f.isActive,
      submissionCount: f.triggerCount,
      lastSubmittedAt: f.lastTriggeredAt?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
    }))

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/triggers/form]', err)
    return errorResponse('Failed to list form triggers', 500)
  }
}

// ─── POST /api/triggers/form ─────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, title, fields } = body as {
      workflowId: string
      title?: string
      fields?: Array<{ name: string; type: string; label: string; required?: boolean }>
    }

    if (!workflowId) {
      return errorResponse('workflowId is required', 400)
    }

    const userId = await getCurrentUserId()

    const workflow = await db.workflow.findUnique({ where: { id: workflowId } })
    if (!workflow) return errorResponse('Workflow not found', 404)
    if (userId && workflow.userId && workflow.userId !== userId) return errorResponse('Workflow not found', 404)

    const triggerId = `form_${crypto.randomBytes(12).toString('hex')}`

    const trigger = await db.webhookTrigger.create({
      data: {
        workflowId,
        triggerId,
        description: `[FORM] ${title || 'Contact Form'}`,
        secret: null,
        isActive: true,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    return successResponse({
      id: trigger.id,
      workflowId: trigger.workflowId,
      formId: trigger.triggerId,
      formUrl: `${baseUrl}/api/triggers/form/${trigger.triggerId}`,
      title: title || 'Contact Form',
      fields: fields || [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'message', type: 'textarea', label: 'Message', required: true },
      ],
      embedHtml: generateEmbedHtml(`${baseUrl}/api/triggers/form/${trigger.triggerId}`, title || 'Contact Form', fields),
      isActive: true,
      createdAt: trigger.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/triggers/form]', err)
    return errorResponse('Failed to create form trigger', 500)
  }
}

// ─── Generate embeddable HTML form ───────────────

function generateEmbedHtml(
  actionUrl: string,
  title: string,
  fields?: Array<{ name: string; type: string; label: string; required?: boolean }>
): string {
  const defaultFields = [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'message', type: 'textarea', label: 'Message', required: true },
  ]

  const formFields = (fields || defaultFields).map((f) => {
    if (f.type === 'textarea') {
      return `<textarea name="${f.name}" placeholder="${f.label}" ${f.required ? 'required' : ''} style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;min-height:80px;"></textarea>`
    }
    return `<input type="${f.type}" name="${f.name}" placeholder="${f.label}" ${f.required ? 'required' : ''} style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" />`
  }).join('\n    ')

  return `<form action="${actionUrl}" method="POST" style="max-width:400px;margin:0 auto;font-family:sans-serif;">
  <h3 style="margin-bottom:16px;">${title}</h3>
  <div style="display:flex;flex-direction:column;gap:12px;">
    ${formFields}
  </div>
  <button type="submit" style="margin-top:16px;padding:10px 24px;background:#7c3aed;color:white;border:none;border-radius:4px;cursor:pointer;">Submit</button>
</form>`
}
