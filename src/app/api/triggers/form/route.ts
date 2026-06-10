// ─── Form Trigger API ───────────────────────────
// GET  /api/triggers/form — List all form triggers
// POST /api/triggers/form — Create a new form trigger

import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── Form Field Definition ──────────────────────

export interface FormFieldDefinition {
  name: string
  type: 'text' | 'email' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'hidden'
  label: string
  required?: boolean
  placeholder?: string
  options?: string[]  // For select/radio fields
  defaultValue?: string
  helpText?: string
}

const DEFAULT_FIELDS: FormFieldDefinition[] = [
  { name: 'name', type: 'text', label: 'Name', required: true, placeholder: 'Your name' },
  { name: 'email', type: 'email', label: 'Email', required: true, placeholder: 'you@example.com' },
  { name: 'message', type: 'textarea', label: 'Message', required: true, placeholder: 'How can we help?' },
]

// ─── GET /api/triggers/form ──────────────────────

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const forms = await db.formTrigger.findMany({
      where: {
        ...(userId ? { workflow: { userId } } : {}),
      },
      include: {
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = forms.map((f) => ({
      id: f.id,
      formId: f.formId,
      name: f.name,
      workflowId: f.workflowId,
      workflowName: f.workflow.name,
      fields: JSON.parse(f.fields),
      isActive: f.isActive,
      submitCount: f.submitCount,
      lastSubmittedAt: f.lastSubmittedAt?.toISOString() ?? null,
      publicUrl: `/f/${f.formId}`,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
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
    const { workflowId, name, fields } = body as {
      workflowId: string
      name?: string
      fields?: FormFieldDefinition[]
    }

    if (!workflowId) {
      return errorResponse('workflowId is required', 400)
    }

    const userId = await getCurrentUserId()

    const workflow = await db.workflow.findUnique({ where: { id: workflowId } })
    if (!workflow) return errorResponse('Workflow not found', 404)
    if (userId && workflow.userId && workflow.userId !== userId) return errorResponse('Workflow not found', 404)

    const formFields = fields && fields.length > 0 ? fields : DEFAULT_FIELDS

    const trigger = await db.formTrigger.create({
      data: {
        name: name || 'Contact Form',
        workflowId,
        fields: JSON.stringify(formFields),
        isActive: true,
      },
    })

    return successResponse({
      id: trigger.id,
      formId: trigger.formId,
      name: trigger.name,
      workflowId: trigger.workflowId,
      fields: formFields,
      isActive: trigger.isActive,
      submitCount: trigger.submitCount,
      publicUrl: `/f/${trigger.formId}`,
      createdAt: trigger.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/triggers/form]', err)
    return errorResponse('Failed to create form trigger', 500)
  }
}
