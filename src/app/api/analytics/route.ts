// ─── Platform Analytics API ───────────────────────
// GET /api/analytics
// Returns platform-wide analytics metrics computed from the database.
// Includes: total workflows, executions, success rates, costs,
// top workflows, cost trends, and error trends.

import { getPlatformMetrics, getRealtimeMetrics } from '@/lib/analytics'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('AnalyticsAPI')

export async function GET() {
  try {
    const [platformMetrics, realtimeMetrics] = await Promise.all([
      getPlatformMetrics(),
      getRealtimeMetrics(),
    ])

    return successResponse({
      platform: platformMetrics,
      realtime: realtimeMetrics,
    })
  } catch (err) {
    log.error({ err }, 'Failed to fetch platform analytics')
    return errorResponse('Failed to fetch analytics', 500)
  }
}
