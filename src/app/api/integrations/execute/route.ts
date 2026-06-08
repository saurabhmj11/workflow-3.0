import { successResponse, errorResponse } from '@/lib/api-utils'
import { executeIntegrationAction } from '@/lib/integrations/registry'

// ─── POST /api/integrations/execute ──────────────
// Execute an integration action (send email, post message, create ticket, etc.)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { integrationId, actionId, input, credentials } = body

    if (!integrationId || !actionId) {
      return errorResponse('integrationId and actionId are required', 400)
    }

    const result = await executeIntegrationAction(
      integrationId,
      actionId,
      input ?? {},
      credentials
    )

    if (result.ok) {
      return successResponse(result.data)
    } else {
      return errorResponse(result.error ?? 'Integration action failed', 400)
    }
  } catch (err) {
    console.error('[POST /api/integrations/execute]', err)
    return errorResponse('Failed to execute integration action', 500)
  }
}
