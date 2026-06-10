import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'

// ─── GET /api/workflows/list ───────────────────────
// Lightweight endpoint returning only workflow id + name
// Used by the trigger-workflow node config panel dropdown

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    const workflows = await db.workflow.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
      },
    })

    return successResponse(workflows)
  } catch (err) {
    console.error('[GET /api/workflows/list]', err)
    return errorResponse('Failed to fetch workflow list', 500)
  }
}
