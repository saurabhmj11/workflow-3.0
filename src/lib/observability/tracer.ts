// ─── OpenWorkflow Distributed Tracing ────────────
// OpenTelemetry-inspired tracing for workflow execution.
// Lightweight, in-memory tracing that captures spans, events,
// token usage, and cost without slowing down execution.

import { createLogger } from '@/lib/logger'

const log = createLogger('Tracer')

// ─── Span ────────────────────────────────────────

/** A single unit of work within a trace */
export interface Span {
  id: string
  traceId: string
  parentId?: string
  name: string
  kind: 'internal' | 'client' | 'server'
  startTime: number  // epoch ms
  endTime?: number
  durationMs?: number
  status: 'ok' | 'error' | 'timeout'
  attributes: Record<string, unknown>
  events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }>
  links?: Array<{ traceId: string; spanId: string }>
}

// ─── Trace ───────────────────────────────────────

/** A complete trace for a single workflow execution */
export interface Trace {
  id: string
  workflowId: string
  runId: string
  startTime: number
  endTime?: number
  durationMs?: number
  status: 'ok' | 'error'
  spans: Span[]
  totalTokenUsage: { prompt: number; completion: number }
  totalCostUsd: number
}

// ─── Tracer ──────────────────────────────────────

/** Maximum traces to keep in memory */
const MAX_TRACES = 500

/** Generate a short random ID */
function generateId(length = 16): string {
  const chars = '0123456789abcdef'
  let id = ''
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Distributed tracer for workflow execution.
 * Inspired by OpenTelemetry but lightweight — all in-memory.
 */
export class Tracer {
  private traces: Map<string, Trace> = new Map()
  private activeSpans: Map<string, Span> = new Map()
  private traceOrder: string[] = [] // for LRU eviction

  /** Start a new trace for a workflow execution */
  startTrace(workflowId: string, runId: string): Trace {
    const trace: Trace = {
      id: generateId(32),
      workflowId,
      runId,
      startTime: Date.now(),
      status: 'ok',
      spans: [],
      totalTokenUsage: { prompt: 0, completion: 0 },
      totalCostUsd: 0,
    }

    this.traces.set(trace.id, trace)
    this.traceOrder.push(trace.id)

    // Evict oldest traces if over limit
    if (this.traces.size > MAX_TRACES) {
      const oldestId = this.traceOrder.shift()
      if (oldestId) {
        this.traces.delete(oldestId)
      }
    }

    log.info({ traceId: trace.id, workflowId, runId }, 'Trace started')
    return trace
  }

  /** Start a new span within a trace */
  startSpan(
    traceId: string,
    name: string,
    parentId?: string,
    attributes?: Record<string, unknown>
  ): Span {
    const trace = this.traces.get(traceId)
    if (!trace) {
      throw new Error(`Trace "${traceId}" not found`)
    }

    const span: Span = {
      id: generateId(16),
      traceId,
      parentId,
      name,
      kind: 'internal',
      startTime: Date.now(),
      status: 'ok',
      attributes: attributes ?? {},
      events: [],
    }

    trace.spans.push(span)
    this.activeSpans.set(span.id, span)

    return span
  }

  /** End a span and compute its duration */
  endSpan(spanId: string, status: Span['status'] = 'ok'): void {
    const span = this.activeSpans.get(spanId)
    if (!span) {
      log.warn({ spanId }, 'Attempted to end unknown span')
      return
    }

    span.endTime = Date.now()
    span.durationMs = span.endTime - span.startTime
    span.status = status

    // Accumulate token usage and cost from span attributes
    const trace = this.traces.get(span.traceId)
    if (trace) {
      const tokenUsage = span.attributes.tokenUsage as { prompt: number; completion: number } | undefined
      if (tokenUsage) {
        trace.totalTokenUsage.prompt += tokenUsage.prompt ?? 0
        trace.totalTokenUsage.completion += tokenUsage.completion ?? 0
      }
      const costUsd = span.attributes.costUsd as number | undefined
      if (costUsd) {
        trace.totalCostUsd += costUsd
      }
    }

    this.activeSpans.delete(spanId)
  }

  /** Add an event to an active span */
  addSpanEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
    const span = this.activeSpans.get(spanId)
    if (!span) {
      log.warn({ spanId }, 'Attempted to add event to unknown span')
      return
    }

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    })
  }

  /** End a trace and compute its total duration */
  endTrace(traceId: string, status: Trace['status'] = 'ok'): Trace {
    const trace = this.traces.get(traceId)
    if (!trace) {
      throw new Error(`Trace "${traceId}" not found`)
    }

    trace.endTime = Date.now()
    trace.durationMs = trace.endTime - trace.startTime
    trace.status = status

    log.info({ traceId, status, durationMs: trace.durationMs, spans: trace.spans.length }, 'Trace ended')
    return trace
  }

  /** Get a trace by its ID */
  getTrace(traceId: string): Trace | undefined {
    return this.traces.get(traceId)
  }

  /** Find a trace by its runId */
  getTraceByRunId(runId: string): Trace | undefined {
    for (const trace of this.traces.values()) {
      if (trace.runId === runId) return trace
    }
    return undefined
  }

  /** Get recent traces, ordered by startTime descending */
  getRecentTraces(limit = 20): Trace[] {
    return Array.from(this.traces.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit)
  }

  /** Get all traces for a specific workflow */
  getWorkflowTraces(workflowId: string, limit = 20): Trace[] {
    return Array.from(this.traces.values())
      .filter(t => t.workflowId === workflowId)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit)
  }

  /** Get trace summary stats */
  getTraceStats(): {
    totalTraces: number
    activeTraces: number
    activeSpans: number
  } {
    let activeTraces = 0
    for (const trace of this.traces.values()) {
      if (!trace.endTime) activeTraces++
    }
    return {
      totalTraces: this.traces.size,
      activeTraces,
      activeSpans: this.activeSpans.size,
    }
  }
}

/** Singleton tracer instance */
export const tracer = new Tracer()
