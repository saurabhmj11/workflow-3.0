// ─── Analytics Engine ─────────────────────────────
// Computes workflow execution metrics from the Prisma database.
// Provides platform-wide analytics, per-workflow analytics,
// and real-time metrics for live dashboards.

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const log = createLogger('AnalyticsEngine')

// ─── Types ──────────────────────────────────────────

/** Comprehensive metrics for a single workflow */
export interface WorkflowMetrics {
  workflowId: string
  totalExecutions: number
  /** Success rate as 0-1 */
  successRate: number
  avgDurationMs: number
  avgCostUsd: number
  totalCostUsd: number
  last24h: {
    executions: number
    successRate: number
    avgDurationMs: number
    errors: number
    costUsd: number
  }
  last7d: {
    executions: number
    successRate: number
    avgDurationMs: number
    errors: number
    costUsd: number
  }
  nodeTypeBreakdown: Record<string, { count: number; avgDurationMs: number; errorRate: number }>
  hourlyTimeline: Array<{ hour: string; executions: number; errors: number; avgDuration: number; cost: number }>
}

/** Platform-wide analytics metrics */
export interface PlatformMetrics {
  totalWorkflows: number
  activeWorkflows: number
  totalExecutions: number
  successRate: number
  totalCostUsd: number
  totalTokensUsed: number
  avgExecutionTime: number
  executionsByTrigger: Record<string, number>
  topWorkflowsByExecutions: Array<{ workflowId: string; name: string; executions: number }>
  costByDay: Array<{ date: string; cost: number }>
  errorTrend: Array<{ date: string; errors: number }>
}

/** Real-time metrics for live dashboard */
export interface RealtimeMetrics {
  activeExecutions: number
  recentCompletions: number
  recentErrors: number
  avgResponseTime: number
}

// ─── Helper: Build time-bucketed data ─────────────

function groupByHour(executions: Array<{ startedAt: Date; status: string; totalDurationMs: number; totalCostUsd: number }>): WorkflowMetrics['hourlyTimeline'] {
  const buckets: Record<string, { executions: number; errors: number; totalDuration: number; totalCost: number }> = {}

  for (const exec of executions) {
    // Format as "YYYY-MM-DD HH:00"
    const hour = exec.startedAt.toISOString().slice(0, 13) + ':00'
    if (!buckets[hour]) {
      buckets[hour] = { executions: 0, errors: 0, totalDuration: 0, totalCost: 0 }
    }
    const b = buckets[hour]
    b.executions++
    b.totalDuration += exec.totalDurationMs
    b.totalCost += exec.totalCostUsd
    if (exec.status === 'error') b.errors++
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, b]) => ({
      hour,
      executions: b.executions,
      errors: b.errors,
      avgDuration: b.executions > 0 ? Math.round(b.totalDuration / b.executions) : 0,
      cost: Math.round(b.totalCost * 10000) / 10000,
    }))
}

function groupByDay<T extends { startedAt: Date }>(items: T[], valueFn: (item: T) => number): Array<{ date: string; value: number }> {
  const buckets: Record<string, number> = {}
  for (const item of items) {
    const date = item.startedAt.toISOString().split('T')[0]
    buckets[date] = (buckets[date] ?? 0) + valueFn(item)
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value: Math.round(value * 10000) / 10000 }))
}

// ─── Per-Workflow Analytics ────────────────────────

/**
 * Compute comprehensive analytics for a specific workflow.
 * Queries the Execution table and processes node-level performance data.
 */
export async function getWorkflowMetrics(workflowId: string): Promise<WorkflowMetrics> {
  const now = Date.now()
  const last24h = new Date(now - 24 * 3600000)
  const last7d = new Date(now - 7 * 86400000)

  // Fetch all executions for this workflow
  const executions = await db.execution.findMany({
    where: { workflowId },
    orderBy: { startedAt: 'desc' },
  })

  const totalExecutions = executions.length
  const successCount = executions.filter(e => e.status === 'success').length
  const totalCost = executions.reduce((a, e) => a + e.totalCostUsd, 0)
  const totalDuration = executions.reduce((a, e) => a + e.totalDurationMs, 0)

  // Last 24h subset
  const exec24h = executions.filter(e => e.startedAt >= last24h)
  const success24h = exec24h.filter(e => e.status === 'success').length
  const errors24h = exec24h.filter(e => e.status === 'error').length
  const cost24h = exec24h.reduce((a, e) => a + e.totalCostUsd, 0)
  const duration24h = exec24h.reduce((a, e) => a + e.totalDurationMs, 0)

  // Last 7d subset
  const exec7d = executions.filter(e => e.startedAt >= last7d)
  const success7d = exec7d.filter(e => e.status === 'success').length
  const errors7d = exec7d.filter(e => e.status === 'error').length
  const cost7d = exec7d.reduce((a, e) => a + e.totalCostUsd, 0)
  const duration7d = exec7d.reduce((a, e) => a + e.totalDurationMs, 0)

  // Node type breakdown — parse steps JSON from executions
  const nodeBreakdown: Record<string, { count: number; totalDuration: number; errors: number }> = {}
  for (const exec of executions) {
    try {
      const steps = JSON.parse(exec.steps) as Array<{
        nodeType?: string
        status?: string
        startedAt?: string
        finishedAt?: string
      }>
      for (const step of steps) {
        const nodeType = step.nodeType ?? 'unknown'
        if (!nodeBreakdown[nodeType]) {
          nodeBreakdown[nodeType] = { count: 0, totalDuration: 0, errors: 0 }
        }
        nodeBreakdown[nodeType].count++
        if (step.status === 'error') nodeBreakdown[nodeType].errors++
        // Compute duration from timestamps
        if (step.startedAt && step.finishedAt) {
          const dur = new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()
          if (dur > 0) nodeBreakdown[nodeType].totalDuration += dur
        }
      }
    } catch {
      // Skip malformed steps
    }
  }

  const nodeTypeBreakdown: WorkflowMetrics['nodeTypeBreakdown'] = {}
  for (const [type, data] of Object.entries(nodeBreakdown)) {
    nodeTypeBreakdown[type] = {
      count: data.count,
      avgDurationMs: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
      errorRate: data.count > 0 ? Math.round((data.errors / data.count) * 1000) / 1000 : 0,
    }
  }

  return {
    workflowId,
    totalExecutions,
    successRate: totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 1000) / 1000 : 0,
    avgDurationMs: totalExecutions > 0 ? Math.round(totalDuration / totalExecutions) : 0,
    avgCostUsd: totalExecutions > 0 ? Math.round((totalCost / totalExecutions) * 10000) / 10000 : 0,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
    last24h: {
      executions: exec24h.length,
      successRate: exec24h.length > 0 ? Math.round((success24h / exec24h.length) * 1000) / 1000 : 0,
      avgDurationMs: exec24h.length > 0 ? Math.round(duration24h / exec24h.length) : 0,
      errors: errors24h,
      costUsd: Math.round(cost24h * 10000) / 10000,
    },
    last7d: {
      executions: exec7d.length,
      successRate: exec7d.length > 0 ? Math.round((success7d / exec7d.length) * 1000) / 1000 : 0,
      avgDurationMs: exec7d.length > 0 ? Math.round(duration7d / exec7d.length) : 0,
      errors: errors7d,
      costUsd: Math.round(cost7d * 10000) / 10000,
    },
    nodeTypeBreakdown,
    hourlyTimeline: groupByHour(executions),
  }
}

// ─── Platform-Wide Analytics ───────────────────────

/**
 * Compute platform-wide analytics metrics.
 * Aggregates data across all workflows and executions.
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  // Total and active workflows
  const totalWorkflows = await db.workflow.count()
  const activeWorkflows = await db.workflow.count({ where: { isActive: true } })

  // All executions
  const executions = await db.execution.findMany({
    orderBy: { startedAt: 'desc' },
    include: { workflow: { select: { name: true } } },
  })

  const totalExecutions = executions.length
  const successCount = executions.filter(e => e.status === 'success').length
  const totalCost = executions.reduce((a, e) => a + e.totalCostUsd, 0)
  const totalDuration = executions.reduce((a, e) => a + e.totalDurationMs, 0)

  // Total tokens used — parse from steps
  let totalTokensUsed = 0
  for (const exec of executions) {
    try {
      const steps = JSON.parse(exec.steps) as Array<{
        tokenUsage?: { prompt?: number; completion?: number }
      }>
      for (const step of steps) {
        if (step.tokenUsage) {
          totalTokensUsed += (step.tokenUsage.prompt ?? 0) + (step.tokenUsage.completion ?? 0)
        }
      }
    } catch {
      // Skip malformed steps
    }
  }

  // Executions by trigger type
  const executionsByTrigger: Record<string, number> = {}
  for (const exec of executions) {
    const trigger = exec.triggeredBy ?? 'api'
    executionsByTrigger[trigger] = (executionsByTrigger[trigger] ?? 0) + 1
  }

  // Top workflows by execution count
  const workflowCounts: Record<string, { name: string; count: number }> = {}
  for (const exec of executions) {
    const wId = exec.workflowId
    if (!workflowCounts[wId]) {
      workflowCounts[wId] = {
        name: (exec as { workflow?: { name: string } | null }).workflow?.name ?? 'Unknown',
        count: 0,
      }
    }
    workflowCounts[wId].count++
  }

  const topWorkflowsByExecutions = Object.entries(workflowCounts)
    .map(([workflowId, data]) => ({ workflowId, name: data.name, executions: data.count }))
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 10)

  // Cost by day
  const costByDay = groupByDay(executions, e => e.totalCostUsd).map(({ date, value }) => ({ date, cost: value }))

  // Error trend by day
  const errorByDay: Record<string, number> = {}
  for (const exec of executions) {
    if (exec.status === 'error') {
      const date = exec.startedAt.toISOString().split('T')[0]
      errorByDay[date] = (errorByDay[date] ?? 0) + 1
    }
  }
  const errorTrend = Object.entries(errorByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, errors]) => ({ date, errors }))

  return {
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    successRate: totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 1000) / 1000 : 0,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
    totalTokensUsed,
    avgExecutionTime: totalExecutions > 0 ? Math.round(totalDuration / totalExecutions) : 0,
    executionsByTrigger,
    topWorkflowsByExecutions,
    costByDay,
    errorTrend,
  }
}

// ─── Real-time Metrics ─────────────────────────────

/**
 * Get real-time metrics for the live dashboard.
 * Counts active executions and recent completions/errors.
 */
export async function getRealtimeMetrics(): Promise<RealtimeMetrics> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60000)
  const oneHourAgo = new Date(Date.now() - 3600000)

  // Currently running executions
  const activeExecutions = await db.execution.count({
    where: { status: 'running' },
  })

  // Completions in the last hour
  const recentCompletions = await db.execution.count({
    where: {
      status: 'success',
      finishedAt: { gte: oneHourAgo },
    },
  })

  // Errors in the last 5 minutes
  const recentErrors = await db.execution.count({
    where: {
      status: 'error',
      finishedAt: { gte: fiveMinutesAgo },
    },
  })

  // Average response time for completions in the last hour
  const recentFinished = await db.execution.findMany({
    where: {
      status: { in: ['success', 'error'] },
      finishedAt: { gte: oneHourAgo },
    },
    select: { totalDurationMs: true },
  })

  const avgResponseTime = recentFinished.length > 0
    ? Math.round(recentFinished.reduce((a, e) => a + e.totalDurationMs, 0) / recentFinished.length)
    : 0

  return {
    activeExecutions,
    recentCompletions,
    recentErrors,
    avgResponseTime,
  }
}
