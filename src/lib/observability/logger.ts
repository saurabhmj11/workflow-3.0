// ─── OpenWorkflow Execution Logger ───────────────
// Structured execution logging for workflow runs.
// Captures log entries with trace/span context for
// correlation with the distributed tracing system.

import { createLogger } from '@/lib/logger'

const log = createLogger('ExecutionLogger')

// ─── Log Entry ───────────────────────────────────

/** A structured log entry from a workflow execution */
export interface ExecutionLogEntry {
  id: string
  traceId: string
  spanId?: string
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  nodeType?: string
  nodeId?: string
  runId?: string
  workflowId?: string
  data?: Record<string, unknown>
}

// ─── Execution Logger ────────────────────────────

/** Maximum log entries to keep in memory */
const DEFAULT_MAX_LOGS = 5000

/** Generate a short random ID */
function generateId(length = 12): string {
  const chars = '0123456789abcdef'
  let id = ''
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Structured execution logger for workflow runs.
 * Each log entry is correlated with a trace and optional span
 * for easy cross-referencing with the tracing system.
 */
export class ExecutionLogger {
  private logs: ExecutionLogEntry[] = []
  private maxLogs: number

  constructor(maxLogs = DEFAULT_MAX_LOGS) {
    this.maxLogs = maxLogs
  }

  /** Add a log entry */
  log(entry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: ExecutionLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
    }

    this.logs.push(fullEntry)

    // Evict oldest logs if over limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Also output to the regular logger for console visibility
    const loggerFn = entry.level === 'error' ? log.error
      : entry.level === 'warn' ? log.warn
      : entry.level === 'debug' ? log.debug
      : log.info

    loggerFn(
      { traceId: entry.traceId, spanId: entry.spanId, nodeId: entry.nodeId, runId: entry.runId },
      entry.message
    )
  }

  /** Convenience: log at info level */
  info(traceId: string, message: string, extra?: Partial<Omit<ExecutionLogEntry, 'id' | 'timestamp' | 'level' | 'traceId' | 'message'>>): void {
    this.log({ traceId, level: 'info', message, ...extra })
  }

  /** Convenience: log at warn level */
  warn(traceId: string, message: string, extra?: Partial<Omit<ExecutionLogEntry, 'id' | 'timestamp' | 'level' | 'traceId' | 'message'>>): void {
    this.log({ traceId, level: 'warn', message, ...extra })
  }

  /** Convenience: log at error level */
  error(traceId: string, message: string, extra?: Partial<Omit<ExecutionLogEntry, 'id' | 'timestamp' | 'level' | 'traceId' | 'message'>>): void {
    this.log({ traceId, level: 'error', message, ...extra })
  }

  /** Convenience: log at debug level */
  debug(traceId: string, message: string, extra?: Partial<Omit<ExecutionLogEntry, 'id' | 'timestamp' | 'level' | 'traceId' | 'message'>>): void {
    this.log({ traceId, level: 'debug', message, ...extra })
  }

  /** Query logs with filters */
  getLogs(filters: {
    traceId?: string
    runId?: string
    workflowId?: string
    level?: string
    limit?: number
  }): ExecutionLogEntry[] {
    let filtered = this.logs

    if (filters.traceId) {
      filtered = filtered.filter(l => l.traceId === filters.traceId)
    }
    if (filters.runId) {
      filtered = filtered.filter(l => l.runId === filters.runId)
    }
    if (filters.workflowId) {
      filtered = filtered.filter(l => l.workflowId === filters.workflowId)
    }
    if (filters.level) {
      filtered = filtered.filter(l => l.level === filters.level)
    }

    // Return most recent first
    const limit = filters.limit ?? 100
    return filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /** Get recent logs across all traces */
  getRecentLogs(limit = 50): ExecutionLogEntry[] {
    return this.logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /** Clear logs, optionally filtered by traceId */
  clearLogs(traceId?: string): void {
    if (traceId) {
      this.logs = this.logs.filter(l => l.traceId !== traceId)
    } else {
      this.logs = []
    }
  }

  /** Get total log count */
  getLogCount(): number {
    return this.logs.length
  }

  /** Get log counts by level */
  getLogCountsByLevel(): Record<string, number> {
    const counts: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 }
    for (const entry of this.logs) {
      counts[entry.level] = (counts[entry.level] ?? 0) + 1
    }
    return counts
  }
}

/** Singleton execution logger instance */
export const executionLogger = new ExecutionLogger()
