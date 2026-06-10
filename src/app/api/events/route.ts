// ─── Server-Sent Events (SSE) Endpoint ──────────
// Provides real-time updates for:
// - Workflow execution progress
// - Approval requests
// - Trigger events
// - Integration status changes
//
// Usage: EventSource('/api/events') on the client side

export const dynamic = 'force-dynamic'

const clients = new Map<string, { id: string; controller: ReadableStreamDefaultController }>()

// Global event bus — other API routes can import and call emit()
const listeners = new Set<(event: SSEEvent) => void>()

export interface SSEEvent {
  type: 'execution' | 'approval' | 'trigger' | 'integration' | 'memory'
  action: string
  data: Record<string, unknown>
}

export function emitSSE(event: SSEEvent): void {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      listeners.delete(listener)
    }
  }
}

export function GET() {
  const clientId = `sse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectMsg = `event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`
      controller.enqueue(new TextEncoder().encode(connectMsg))

      // Register client
      clients.set(clientId, { id: clientId, controller })

      // Register listener
      const listener = (event: SSEEvent) => {
        try {
          const msg = `event: ${event.type}\ndata: ${JSON.stringify({ ...event.data, action: event.action })}\n\n`
          controller.enqueue(new TextEncoder().encode(msg))
        } catch {
          listeners.delete(listener)
          clients.delete(clientId)
        }
      }

      listeners.add(listener)

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: heartbeat\ndata: ${Date.now()}\n\n`))
        } catch {
          clearInterval(heartbeat)
          listeners.delete(listener)
          clients.delete(clientId)
        }
      }, 30000)
    },
    cancel() {
      clients.delete(clientId)
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
