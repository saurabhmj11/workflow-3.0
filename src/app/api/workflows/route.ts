import { db } from '@/lib/db'
import { successResponse, errorResponse, serializeWorkflow, parseNodes, parseEdges } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { auditLog, getRequestMeta, AUDIT_ACTIONS } from '@/lib/audit'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

// ─── GET /api/workflows ────────────────────────────
// List all workflows ordered by updatedAt desc
// Scoped to current user if authenticated (multi-tenancy)

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const workflows = await db.workflow.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: 'desc' },
      include: { nodes: true, edges: true },
    })

    return successResponse(workflows.map(serializeWorkflow))
  } catch (err) {
    console.error('[GET /api/workflows]', err)
    return errorResponse('Failed to fetch workflows', 500)
  }
}

// ─── POST /api/workflows ───────────────────────────
// Create a new workflow with optional name, nodes, edges
// Associates workflow with current user if authenticated

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()

    const name = typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : 'Untitled Workflow'

    const description = typeof body.description === 'string' ? body.description : undefined
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : false
    const metadata = body.metadata ? JSON.stringify(body.metadata) : undefined

    const nodes: NodeDefinition[] = Array.isArray(body.nodes) ? body.nodes : []
    const edges: EdgeDefinition[] = Array.isArray(body.edges) ? body.edges : []

    const workflow = await db.workflow.create({
      data: {
        name,
        description,
        isActive,
        metadata,
        userId: userId ?? undefined,
        nodes: { create: parseNodes(nodes) },
        edges: { create: parseEdges(edges) },
      },
      include: { nodes: true, edges: true },
    })

    // Audit log — fire-and-forget
    auditLog({
      userId: userId ?? undefined,
      action: AUDIT_ACTIONS.WORKFLOW_CREATED,
      resource: 'workflow',
      resourceId: workflow.id,
      resourceName: workflow.name,
      ...getRequestMeta(request),
    }).catch(() => {})

    return successResponse(serializeWorkflow(workflow), 201)
  } catch (err) {
    console.error('[POST /api/workflows]', err)
    return errorResponse('Failed to create workflow', 500)
  }
}
