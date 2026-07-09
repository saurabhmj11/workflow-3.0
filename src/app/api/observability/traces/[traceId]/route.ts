import { successResponse, errorResponse } from '@/lib/api-utils'
import { tracer } from '@/lib/observability/tracer'

// ─── GET /api/observability/traces/[traceId] ─────
// Get trace details with all spans

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ traceId: string }> }
) {
  try {
    const { traceId } = await params
    const trace = tracer.getTrace(traceId)

    if (!trace) {
      return errorResponse(`Trace "${traceId}" not found`, 404)
    }

    // Build span tree for visualization
    const spanMap = new Map(trace.spans.map(s => [s.id, s]))
    const rootSpans = trace.spans.filter(s => !s.parentId)

    type SpanType = NonNullable<typeof trace>['spans'][0]
    interface SpanNode {
      span: SpanType
      children: SpanNode[]
    }

    function buildSpanTree(span: SpanType): SpanNode {
      const children = trace!.spans.filter(s => s.parentId === span.id)
      return {
        span,
        children: children.map(buildSpanTree),
      }
    }

    const spanTree = rootSpans.map(buildSpanTree)

    return successResponse({
      id: trace.id,
      workflowId: trace.workflowId,
      runId: trace.runId,
      startTime: trace.startTime,
      endTime: trace.endTime,
      durationMs: trace.durationMs,
      status: trace.status,
      totalTokenUsage: trace.totalTokenUsage,
      totalCostUsd: trace.totalCostUsd,
      spans: trace.spans.map(s => ({
        id: s.id,
        traceId: s.traceId,
        parentId: s.parentId,
        name: s.name,
        kind: s.kind,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMs: s.durationMs,
        status: s.status,
        attributes: s.attributes,
        events: s.events,
        links: s.links,
      })),
      spanTree,
    })
  } catch (err) {
    console.error('[GET /api/observability/traces/[traceId]]', err)
    return errorResponse('Failed to fetch trace', 500)
  }
}
