// ─── Collaboration SSE Endpoint ───────────────────
// GET /api/collaboration?workflowId=...&userId=...&userName=...
// Establishes a Server-Sent Events connection for a workflow room.
// Sends: join/leave events, cursor updates, node changes, chat messages.
// Heartbeat every 30 seconds to keep connection alive.

export const dynamic = 'force-dynamic'

import { collabManager } from '@/lib/collaboration'
import { createLogger } from '@/lib/logger'

const log = createLogger('CollaborationSSE')

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workflowId = searchParams.get('workflowId')
  const userId = searchParams.get('userId')
  const userName = searchParams.get('userName') ?? 'Anonymous'

  if (!workflowId || !userId) {
    return new Response(JSON.stringify({ ok: false, error: 'workflowId and userId are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const clientId = `collab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const userColor = collabManager.getUserColor(userId)

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event with user info
      const connectMsg = `event: connected\ndata: ${JSON.stringify({
        clientId,
        userId,
        color: userColor,
        timestamp: Date.now(),
        users: collabManager.getRoomUsers(workflowId),
      })}\n\n`
      controller.enqueue(new TextEncoder().encode(connectMsg))

      // Register the SSE client
      collabManager.registerClient({
        id: clientId,
        userId,
        workflowId,
        controller,
      })

      // Join the room
      collabManager.joinRoom(workflowId, {
        id: userId,
        name: userName,
        color: userColor,
        lastActive: Date.now(),
      })

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: heartbeat\ndata: ${Date.now()}\n\n`))
        } catch {
          clearInterval(heartbeat)
          cleanup()
        }
      }, 30000)

      // Cleanup on close
      function cleanup() {
        clearInterval(heartbeat)
        collabManager.leaveRoom(workflowId, userId)
        collabManager.removeClient(clientId)
        log.info({ clientId, userId, workflowId }, 'SSE connection closed')
      }

      // Handle abort signal
      // Note: request.signal fires when the client disconnects
      request.signal.addEventListener('abort', () => {
        cleanup()
      })
    },
    cancel() {
      collabManager.removeClient(clientId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
