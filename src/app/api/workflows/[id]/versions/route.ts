import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'

// ─── GET /api/workflows/[id]/versions ──────────────
// List all versions of a workflow, ordered by version desc

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const workflow = await db.workflow.findUnique({ where: { id } })
    if (!workflow) {
      return errorResponse('Workflow not found', 404)
    }

    const versions = await db.workflowVersion.findMany({
      where: { workflowId: id },
      orderBy: { version: 'desc' },
    })

    const data = versions.map((v) => {
      const snapshot = JSON.parse(v.snapshot) as { nodes: unknown[]; edges: unknown[] }
      return {
        id: v.id,
        workflowId: v.workflowId,
        version: v.version,
        name: v.name,
        description: v.description ?? undefined,
        changeNote: v.changeNote ?? undefined,
        nodeCount: snapshot.nodes.length,
        edgeCount: snapshot.edges.length,
        createdAt: v.createdAt.toISOString(),
      }
    })

    return successResponse(data)
  } catch (err) {
    console.error('[GET /api/workflows/[id]/versions]', err)
    return errorResponse('Failed to fetch versions', 500)
  }
}

// ─── POST /api/workflows/[id]/versions ─────────────
// Create a new version snapshot

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const workflow = await db.workflow.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    })
    if (!workflow) {
      return errorResponse('Workflow not found', 404)
    }

    const body = await request.json()
    const changeNote = typeof body.changeNote === 'string' ? body.changeNote : undefined

    // Get the latest version number
    const latestVersion = await db.workflowVersion.findFirst({
      where: { workflowId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    const nextVersion = (latestVersion?.version ?? 0) + 1

    // Build the snapshot from current workflow state
    // If body includes nodes/edges, use those; otherwise use the DB records
    const nodes = Array.isArray(body.nodes) ? body.nodes : workflow.nodes.map((n) => ({
      id: n.nodeId,
      type: n.type,
      label: n.label,
      category: n.category,
      config: JSON.parse(n.config),
      position: { x: n.positionX, y: n.positionY },
    }))

    const edges = Array.isArray(body.edges) ? body.edges : workflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))

    const snapshot = JSON.stringify({ nodes, edges })

    const version = await db.workflowVersion.create({
      data: {
        workflowId: id,
        version: nextVersion,
        name: `v${nextVersion}`,
        description: workflow.description,
        snapshot,
        changeNote: changeNote ?? `Version ${nextVersion}`,
      },
    })

    // Also update the workflow's version counter
    await db.workflow.update({
      where: { id },
      data: { version: nextVersion },
    })

    return successResponse({
      id: version.id,
      workflowId: version.workflowId,
      version: version.version,
      name: version.name,
      changeNote: version.changeNote,
      createdAt: version.createdAt.toISOString(),
    }, 201)
  } catch (err) {
    console.error('[POST /api/workflows/[id]/versions]', err)
    return errorResponse('Failed to create version', 500)
  }
}
