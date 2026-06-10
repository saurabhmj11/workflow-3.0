import { db } from '@/lib/db'
import { successResponse, errorResponse, serializeWorkflow, parseNodes, parseEdges } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

// ─── GET /api/workflows/[id] ───────────────────────
// Get a single workflow with its nodes and edges
// Scoped to current user if authenticated (multi-tenancy)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId()

    const workflow = await db.workflow.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    })

    if (!workflow) {
      return errorResponse('Workflow not found', 404)
    }

    // If authenticated, verify the workflow belongs to the user
    if (userId && workflow.userId && workflow.userId !== userId) {
      return errorResponse('Workflow not found', 404)
    }

    return successResponse(serializeWorkflow(workflow))
  } catch (err) {
    console.error('[GET /api/workflows/[id]]', err)
    return errorResponse('Failed to fetch workflow', 500)
  }
}

// ─── PUT /api/workflows/[id] ───────────────────────
// Update a workflow — replaces all nodes and edges in a transaction
// Scoped to current user if authenticated (multi-tenancy)

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId()

    // Check workflow exists and belongs to user
    const existing = await db.workflow.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Workflow not found', 404)
    }

    // If authenticated, verify the workflow belongs to the user
    if (userId && existing.userId && existing.userId !== userId) {
      return errorResponse('Workflow not found', 404)
    }

    const body = await request.json()

    const name = typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : undefined
    const description = body.description !== undefined
      ? (typeof body.description === 'string' ? body.description : null)
      : undefined
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : undefined
    const metadata = body.metadata !== undefined ? JSON.stringify(body.metadata) : undefined

    const nodes: NodeDefinition[] | undefined = Array.isArray(body.nodes) ? body.nodes : undefined
    const edges: EdgeDefinition[] | undefined = Array.isArray(body.edges) ? body.edges : undefined

    const workflow = await db.$transaction(async (tx) => {
      // If nodes/edges are provided, replace them all
      if (nodes !== undefined) {
        await tx.xmlNode.deleteMany({ where: { workflowId: id } })
      }
      if (edges !== undefined) {
        await tx.edge.deleteMany({ where: { workflowId: id } })
      }

      const updated = await tx.workflow.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
          ...(metadata !== undefined && { metadata }),
          ...(nodes !== undefined && {
            nodes: { create: parseNodes(nodes) },
          }),
          ...(edges !== undefined && {
            edges: { create: parseEdges(edges) },
          }),
        },
        include: { nodes: true, edges: true },
      })

      return updated
    })

    // Audit log — fire-and-forget
    auditLog({
      userId: userId ?? undefined,
      action: AUDIT_ACTIONS.WORKFLOW_UPDATED,
      resource: 'workflow',
      resourceId: id,
      resourceName: workflow.name,
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse(serializeWorkflow(workflow))
  } catch (err) {
    console.error('[PUT /api/workflows/[id]]', err)
    return errorResponse('Failed to update workflow', 500)
  }
}

// ─── DELETE /api/workflows/[id] ────────────────────
// Delete a workflow and cascade
// Scoped to current user if authenticated (multi-tenancy)

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getCurrentUserId()

    const existing = await db.workflow.findUnique({ where: { id } })
    if (!existing) {
      return errorResponse('Workflow not found', 404)
    }

    // If authenticated, verify the workflow belongs to the user
    if (userId && existing.userId && existing.userId !== userId) {
      return errorResponse('Workflow not found', 404)
    }

    await db.workflow.delete({ where: { id } })

    // Audit log — fire-and-forget
    auditLog({
      userId: userId ?? undefined,
      action: AUDIT_ACTIONS.WORKFLOW_DELETED,
      resource: 'workflow',
      resourceId: id,
      resourceName: existing.name,
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse({ id, deleted: true })
  } catch (err) {
    console.error('[DELETE /api/workflows/[id]]', err)
    return errorResponse('Failed to delete workflow', 500)
  }
}
