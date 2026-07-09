// ─── Collaboration Event Broadcaster ──────────────
// POST /api/collaboration/events
// Receives collaboration events (cursor moves, node changes, chat, etc.)
// and broadcasts them to all connected SSE clients in the room.

import { collabManager, type CollabEvent } from '@/lib/collaboration'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('CollaborationEvents')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workflowId, userId, event } = body as {
      workflowId?: string
      userId?: string
      event?: CollabEvent
    }

    if (!workflowId || !userId || !event) {
      return errorResponse('workflowId, userId, and event are required')
    }

    // Validate event type
    const validTypes: CollabEvent['type'][] = [
      'cursor', 'node_move', 'node_update', 'node_add', 'node_delete',
      'edge_add', 'edge_delete', 'select', 'chat',
    ]
    if (!validTypes.includes(event.type)) {
      return errorResponse(`Invalid event type: ${event.type}`)
    }

    // Handle cursor updates specially — update the room state
    if (event.type === 'cursor' && event.data.cursor) {
      collabManager.updateCursor(workflowId, userId, event.data.cursor as { x: number; y: number; nodeId?: string })
    }

    // Broadcast the event to all room members
    const collabEvent: CollabEvent = {
      ...event,
      userId,
      workflowId,
      timestamp: Date.now(),
    }
    collabManager.broadcastEvent(workflowId, collabEvent)

    log.debug({ workflowId, userId, eventType: event.type }, 'Event broadcast')

    return successResponse({ broadcast: true })
  } catch (err) {
    log.error({ err }, 'Failed to broadcast event')
    return errorResponse('Failed to broadcast event', 500)
  }
}
