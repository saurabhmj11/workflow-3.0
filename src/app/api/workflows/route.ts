import { db } from '@/lib/db'
import { successResponse, errorResponse, serializeWorkflow, parseNodes, parseEdges } from '@/lib/api-utils'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

// ─── GET /api/workflows ────────────────────────────
// List all workflows ordered by updatedAt desc

export async function GET() {
  try {
    const workflows = await db.workflow.findMany({
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

export async function POST(request: Request) {
  try {
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
        nodes: { create: parseNodes(nodes) },
        edges: { create: parseEdges(edges) },
      },
      include: { nodes: true, edges: true },
    })

    return successResponse(serializeWorkflow(workflow), 201)
  } catch (err) {
    console.error('[POST /api/workflows]', err)
    return errorResponse('Failed to create workflow', 500)
  }
}
