// ─── Live Analytics SSE Endpoint ──────────────────
// GET /api/analytics/live
// Establishes a Server-Sent Events connection for live metrics.
// Polls the database every 5 seconds for new execution data.
// Sends: real-time execution updates, error alerts, cost tracking.
// Heartbeat every 30 seconds.

export const dynamic = 'force-dynamic'

import { getRealtimeMetrics, type RealtimeMetrics } from '@/lib/analytics'
import { createLogger } from '@/lib/logger'

const log = createLogger('AnalyticsLiveSSE')

export async function GET(request: Request) {
  const clientId = `analytics_live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  let lastMetrics: RealtimeMetrics | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectMsg = `event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`
      controller.enqueue(new TextEncoder().encode(connectMsg))

      // Fetch and send metrics every 5 seconds
      const metricsInterval = setInterval(async () => {
        try {
          const metrics = await getRealtimeMetrics()

          // Only send if something changed
          const changed = !lastMetrics ||
            metrics.activeExecutions !== lastMetrics.activeExecutions ||
            metrics.recentCompletions !== lastMetrics.recentCompletions ||
            metrics.recentErrors !== lastMetrics.recentErrors ||
            metrics.avgResponseTime !== lastMetrics.avgResponseTime

          if (changed) {
            lastMetrics = metrics
            const msg = `event: metrics\ndata: ${JSON.stringify({ ...metrics, timestamp: Date.now() })}\n\n`
            controller.enqueue(new TextEncoder().encode(msg))

            // If there are new errors, send an alert event
            if (metrics.recentErrors > (lastMetrics?.recentErrors ?? 0)) {
              const alertMsg = `event: alert\ndata: ${JSON.stringify({
                type: 'error_spike',
                message: `${metrics.recentErrors} recent errors detected`,
                severity: 'high',
                timestamp: Date.now(),
              })}\n\n`
              controller.enqueue(new TextEncoder().encode(alertMsg))
            }
          }
        } catch (err) {
          log.error({ err }, 'Failed to fetch live metrics')
        }
      }, 5000)

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: heartbeat\ndata: ${Date.now()}\n\n`))
        } catch {
          clearInterval(heartbeat)
          clearInterval(metricsInterval)
        }
      }, 30000)

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(metricsInterval)
        clearInterval(heartbeat)
        log.info({ clientId }, 'Live analytics SSE disconnected')
      })
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
