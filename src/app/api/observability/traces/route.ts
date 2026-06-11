import { successResponse, errorResponse } from '@/lib/api-utils'
import { tracer } from '@/lib/observability/tracer'

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

// ─── GET /api/observability/traces ───────────────
// List recent traces with optional filters

export async function GET(request: Request) {
  try {
    await ensureDemoData()
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId') ?? undefined
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 20), 1), 100)

    const traces = workflowId
      ? tracer.getWorkflowTraces(workflowId, limit)
      : tracer.getRecentTraces(limit)

    const stats = tracer.getTraceStats()

    return successResponse({
      traces: traces.map(t => ({
        id: t.id,
        workflowId: t.workflowId,
        runId: t.runId,
        startTime: t.startTime,
        endTime: t.endTime,
        durationMs: t.durationMs,
        status: t.status,
        spanCount: t.spans.length,
        totalTokenUsage: t.totalTokenUsage,
        totalCostUsd: t.totalCostUsd,
      })),
      stats,
    })
  } catch (err) {
    console.error('[GET /api/observability/traces]', err)
    return errorResponse('Failed to fetch traces', 500)
  }
}
