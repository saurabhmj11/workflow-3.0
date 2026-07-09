import { successResponse, errorResponse } from '@/lib/api-utils'
import { INTEGRATIONS } from '@/lib/integrations/registry'

// ─── GET /api/integrations ───────────────────────
// List all available integrations with their status and actions

export async function GET() {
  try {
    return successResponse(INTEGRATIONS.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      icon: i.icon,
      category: i.category,
      authType: i.authType,
      status: i.status,
      actions: i.actions.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        inputSchema: a.inputSchema,
      })),
    })))
  } catch (err) {
    console.error('[GET /api/integrations]', err)
    return errorResponse('Failed to fetch integrations', 500)
  }
}
