import { db } from '@/lib/db'
import { successResponse, errorResponse, parseNodes, parseEdges } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── GET /api/workflows/[id]/versions/[version] ────
// Get a specific version's full snapshot
// Scoped to current user if authenticated (multi-tenancy)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const { id, version: versionStr } = await params
    const versionNum = parseInt(versionStr, 10)
    const userId = await getCurrentUserId()

    if (isNaN(versionNum)) {
      return errorResponse('Invalid version number', 400)
    }

    // Verify workflow belongs to user if authenticated
    if (userId) {
      const workflow = await db.workflow.findUnique({ where: { id } })
      if (!workflow || (workflow.userId && workflow.userId !== userId)) {
        return errorResponse('Workflow not found', 404)
      }
    }

    const version = await db.workflowVersion.findUnique({
      where: {
        workflowId_version: { workflowId: id, version: versionNum },
      },
    })

    if (!version) {
      return errorResponse('Version not found', 404)
    }

    const snapshot = JSON.parse(version.snapshot) as { nodes: unknown[]; edges: unknown[] }

    return successResponse({
      id: version.id,
      workflowId: version.workflowId,
      version: version.version,
      name: version.name,
      description: version.description ?? undefined,
      changeNote: version.changeNote ?? undefined,
      snapshot,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
      createdAt: version.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('[GET /api/workflows/[id]/versions/[version]]', err)
    return errorResponse('Failed to fetch version', 500)
  }
}

// ─── POST /api/workflows/[id]/versions/[version] ───
// Restore/rollback to this version — replaces current workflow nodes/edges with the snapshot
// Scoped to current user if authenticated (multi-tenancy)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const { id, version: versionStr } = await params
    const versionNum = parseInt(versionStr, 10)
    const userId = await getCurrentUserId()

    if (isNaN(versionNum)) {
      return errorResponse('Invalid version number', 400)
    }

    // Verify workflow belongs to user if authenticated
    if (userId) {
      const workflow = await db.workflow.findUnique({ where: { id } })
      if (!workflow || (workflow.userId && workflow.userId !== userId)) {
        return errorResponse('Workflow not found', 404)
      }
    }

    const version = await db.workflowVersion.findUnique({
      where: {
        workflowId_version: { workflowId: id, version: versionNum },
      },
    })

    if (!version) {
      return errorResponse('Version not found', 404)
    }

    const snapshot = JSON.parse(version.snapshot) as {
      nodes: Array<{
        id: string
        type: string
        label: string
        category: string
        config: Record<string, unknown>
        position: { x: number; y: number }
      }>
      edges: Array<{
        id: string
        source: string
        target: string
        sourceHandle: string
        targetHandle: string
      }>
    }

    // Replace workflow nodes and edges with the snapshot data in a transaction
    const workflow = await db.$transaction(async (tx) => {
      // Delete existing nodes and edges
      await tx.xmlNode.deleteMany({ where: { workflowId: id } })
      await tx.edge.deleteMany({ where: { workflowId: id } })

      // Recreate from snapshot
      const updated = await tx.workflow.update({
        where: { id },
        data: {
          nodes: { create: parseNodes(snapshot.nodes) },
          edges: { create: parseEdges(snapshot.edges) },
        },
        include: { nodes: true, edges: true },
      })

      return updated
    })

    // Create a new version snapshot to record the rollback
    const latestVersion = await db.workflowVersion.findFirst({
      where: { workflowId: id },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const nextVersion = (latestVersion?.version ?? 0) + 1

    await db.workflowVersion.create({
      data: {
        workflowId: id,
        version: nextVersion,
        name: `v${nextVersion}`,
        snapshot: version.snapshot, // Same snapshot as the restored version
        changeNote: `Rolled back to v${versionNum}`,
      },
    })

    await db.workflow.update({
      where: { id },
      data: { version: nextVersion },
    })

    return successResponse({
      restored: true,
      version: versionNum,
      newVersion: nextVersion,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
    })
  } catch (err) {
    console.error('[POST /api/workflows/[id]/versions/[version]]', err)
    return errorResponse('Failed to restore version', 500)
  }
}
