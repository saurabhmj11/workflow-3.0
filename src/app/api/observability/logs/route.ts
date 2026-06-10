import { successResponse, errorResponse } from '@/lib/api-utils'
import { executionLogger } from '@/lib/observability/logger'

// ─── Lazy-init demo data on first call ───────────
let demoDataSeeded = false
async function ensureDemoData() {
  if (demoDataSeeded) return
  demoDataSeeded = true
  try {
    const { seedDemoObservabilityData } = await import('@/lib/observability/seed')
    seedDemoObservabilityData()
  } catch (err) {
    console.error('[Observability] Failed to seed demo data:', err)
  }
}

// ─── GET /api/observability/logs ─────────────────
// Query execution logs with filters

export async function GET(request: Request) {
  try {
    await ensureDemoData()
    const { searchParams } = new URL(request.url)
    const traceId = searchParams.get('traceId') ?? undefined
    const runId = searchParams.get('runId') ?? undefined
    const workflowId = searchParams.get('workflowId') ?? undefined
    const level = searchParams.get('level') ?? undefined
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 100), 1), 500)

    const logs = executionLogger.getLogs({
      traceId,
      runId,
      workflowId,
      level,
      limit,
    })

    const countsByLevel = executionLogger.getLogCountsByLevel()

    return successResponse({
      logs,
      total: executionLogger.getLogCount(),
      countsByLevel,
    })
  } catch (err) {
    console.error('[GET /api/observability/logs]', err)
    return errorResponse('Failed to fetch logs', 500)
  }
}
