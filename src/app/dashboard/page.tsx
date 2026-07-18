'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Clock,
  Brain,
  Users,
  Activity,
  Zap,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  ThumbsUp,
  ThumbsDown,
  Workflow,
  Bell,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { motion, Variants } from 'framer-motion'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, duration: 0.3 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
}

// ─── Colors ──────────────────────────────────────
const COLORS = {
  emerald: '#10b981',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  zinc: '#71717a',
}

// ─── Types ───────────────────────────────────────
interface PlatformMetrics {
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

interface RealtimeMetrics {
  activeExecutions: number
  recentCompletions: number
  recentErrors: number
  avgResponseTime: number
}

interface ExecutionRecord {
  id: string
  workflowId: string
  workflowName?: string
  runId: string
  status: string
  triggeredBy: string
  steps: Array<{ nodeType?: string; status?: string; output?: any; startedAt?: string; finishedAt?: string; tokenUsage?: { prompt?: number; completion?: number } }>
  totalDurationMs: number
  totalCostUsd: number
  error?: string
  startedAt: string
  finishedAt?: string
}

interface ApprovalRecord {
  id: string
  runId: string
  nodeId: string
  workflowId: string
  assignee?: string | null
  status: string
  context?: any
  notes?: string | null
  slaDeadline?: string | null
  createdAt: string
  resolvedAt?: string | null
}

interface NotificationRecord {
  id: string
  type: string
  title: string
  message: string
  category: string
  priority: string
  isRead: boolean
  actionUrl?: string | null
  createdAt: string
}

interface WorkflowSummary {
  id: string
  name: string
  isActive?: boolean
}

// ─── Metric Card ─────────────────────────────────
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'cyan',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  color?: string
}) {
  const iconColorMap: Record<string, string> = {
    cyan: 'text-zinc-400',
    emerald: 'text-zinc-400',
    amber: 'text-zinc-400',
    violet: 'text-zinc-400',
    red: 'text-zinc-400',
    blue: 'text-zinc-400',
  }
  const iconClass = iconColorMap[color] ?? 'text-zinc-400'

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className="h-full bg-zinc-950/50 border-zinc-800/80 shadow-none hover:border-zinc-700/80 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-zinc-400 tracking-wide">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-zinc-100">{value}</div>
          {(subtitle || trendLabel) && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
              {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
              {trend === 'neutral' && <Activity className="h-3 w-3 text-zinc-500" />}
              <span className={`text-xs ${
                trend === 'up' ? 'text-emerald-500/90' : trend === 'down' ? 'text-red-500/90' : 'text-zinc-500'
              }`}>
                {trendLabel || subtitle}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Dashboard Page ─────────────────────────
export default function AIEmployeeDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // ─── Auth Guard ─────────────────────────────────
  // Redirect to login if not authenticated (client-side, middleware is passthrough)
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  // Show loading while checking session
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-zinc-400">{status === 'unauthenticated' ? 'Redirecting to login...' : 'Loading Dashboard...'}</p>
        </div>
      </div>
    )
  }

  // ─── API Data State ────────────────────────────
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null)
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null)
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])

  // ─── UI State ──────────────────────────────────
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLiveConnected, setIsLiveConnected] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // ─── Fetch all data from APIs ──────────────────
  const fetchAllData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    setFetchError(null)

    try {
      const [analyticsRes, executionsRes, approvalsRes, notificationsRes, workflowsRes] = await Promise.allSettled([
        fetch('/api/analytics'),
        fetch('/api/executions?limit=50'),
        fetch('/api/approvals'),
        fetch('/api/notifications?limit=10'),
        fetch('/api/workflows/list'),
      ])

      // Process analytics
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        try {
          const json = await analyticsRes.value.json()
          if (json.ok) {
            setPlatformMetrics(json.data.platform)
            setRealtimeMetrics(json.data.realtime)
          }
        } catch (e) { console.error('Failed to parse analytics JSON', e) }
      }

      // Process executions
      if (executionsRes.status === 'fulfilled' && executionsRes.value.ok) {
        try {
          const json = await executionsRes.value.json()
          if (json.ok && Array.isArray(json.data)) {
            setExecutions(json.data)
          }
        } catch (e) { console.error('Failed to parse executions JSON', e) }
      }

      // Process approvals
      if (approvalsRes.status === 'fulfilled' && approvalsRes.value.ok) {
        try {
          const json = await approvalsRes.value.json()
          if (json.ok && Array.isArray(json.data)) {
            setApprovals(json.data)
          }
        } catch (e) { console.error('Failed to parse approvals JSON', e) }
      }

      // Process notifications
      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.ok) {
        try {
          const json = await notificationsRes.value.json()
          if (json.ok && json.data) {
            setNotifications(json.data.notifications ?? json.data ?? [])
          }
        } catch (e) { console.error('Failed to parse notifications JSON', e) }
      }

      // Process workflows
      if (workflowsRes.status === 'fulfilled' && workflowsRes.value.ok) {
        try {
          const json = await workflowsRes.value.json()
          if (json.ok && Array.isArray(json.data)) {
            setWorkflows(json.data)
          }
        } catch (e) { console.error('Failed to parse workflows JSON', e) }
      }

      setLastRefreshed(new Date())
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // ─── Initial data fetch ────────────────────────
  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // ─── SSE Live Analytics Connection ─────────────
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connectSSE() {
      try {
        eventSource = new EventSource('/api/analytics/live')

        eventSource.addEventListener('connected', () => {
          setIsLiveConnected(true)
        })

        eventSource.addEventListener('metrics', (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data)
            setRealtimeMetrics({
              activeExecutions: data.activeExecutions ?? 0,
              recentCompletions: data.recentCompletions ?? 0,
              recentErrors: data.recentErrors ?? 0,
              avgResponseTime: data.avgResponseTime ?? 0,
            })
            setLastRefreshed(new Date())
          } catch {
            // Ignore malformed SSE data
          }
        })

        eventSource.addEventListener('alert', (e) => {
          try {
            const data = JSON.parse((e as MessageEvent).data)
            if (data.type === 'error_spike') {
              // Refresh executions to show new errors
              fetch('/api/executions?limit=50')
                .then(r => r.json())
                .then(json => {
                  if (json.ok && Array.isArray(json.data)) setExecutions(json.data)
                })
                .catch(() => {})
            }
          } catch {
            // Ignore
          }
        })

        eventSource.onerror = () => {
          setIsLiveConnected(false)
          eventSource?.close()
          // Reconnect after 10 seconds
          reconnectTimer = setTimeout(connectSSE, 10000)
        }
      } catch {
        setIsLiveConnected(false)
      }
    }

    connectSSE()

    return () => {
      eventSource?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  const handleApproval = useCallback(async (approvalId: string, action: 'approved' | 'rejected') => {
    setActionLoading(prev => ({ ...prev, [approvalId]: true }))
    const previousApprovals = [...approvals];
    
    // Optimistic UI update
    setApprovals(prev => prev.map(a =>
      a.id === approvalId
        ? { ...a, status: action, resolvedAt: new Date().toISOString() }
        : a
    ))

    try {
      const res = await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approvalId, status: action }),
      })
      const json = await res.json()
      if (!json.ok) {
        throw new Error(json.error || 'Failed to update approval')
      }
    } catch (err) {
      // Revert optimistic update on failure
      setApprovals(previousApprovals)
      console.error('Failed to update approval:', err)
      // Note: Ideally display a toast notification here
    } finally {
      setActionLoading(prev => ({ ...prev, [approvalId]: false }))
    }
  }, [approvals])

  // ─── Compute Metrics from Real Data ────────────
  const metrics = useMemo(() => {
    const completedRuns = executions.filter(r => r.status === 'success')
    const failedRuns = executions.filter(r => r.status === 'error')
    const pendingApprovals = approvals.filter(r => r.status === 'pending')
    const resolvedApprovals = approvals.filter(r => r.status !== 'pending')

    const totalRuns = executions.length
    const successRate = platformMetrics?.successRate
      ? Math.round(platformMetrics.successRate * 100)
      : totalRuns > 0 ? Math.round((completedRuns.length / totalRuns) * 100) : 0

    const avgDuration = platformMetrics?.avgExecutionTime
      ?? (completedRuns.length > 0
        ? Math.round(completedRuns.reduce((acc, r) => acc + r.totalDurationMs, 0) / completedRuns.length)
        : 0)

    const totalCost = platformMetrics?.totalCostUsd ?? executions.reduce((acc, r) => acc + (r.totalCostUsd ?? 0), 0)

    // Confidence from execution steps
    const allConfidences: number[] = []
    for (const run of completedRuns) {
      for (const step of run.steps) {
        if (step.status === 'success' && step.output) {
          const output = step.output as { confidence?: number }
          if (typeof output.confidence === 'number') {
            allConfidences.push(output.confidence)
          }
        }
      }
    }
    const avgConfidence = allConfidences.length > 0
      ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
      : 0

    const escalationRate = totalRuns > 0
      ? Math.round((approvals.length / totalRuns) * 100)
      : 0

    // Status distribution
    const statusData = [
      { name: 'Success', value: completedRuns.length, color: COLORS.emerald },
      { name: 'Failed', value: failedRuns.length, color: COLORS.red },
      { name: 'Awaiting', value: executions.filter(r => r.status === 'awaiting_approval').length, color: COLORS.amber },
      { name: 'Running', value: executions.filter(r => r.status === 'running').length, color: COLORS.blue },
    ].filter(d => d.value > 0)

    // Cost over time (from API costByDay or from executions)
    const costOverTime = platformMetrics?.costByDay?.length
      ? platformMetrics.costByDay.slice(-14).map(d => ({ name: d.date.slice(5), cost: d.cost }))
      : executions.slice(0, 10).reverse().map((r, i) => ({
          name: `Run ${i + 1}`,
          cost: Math.round((r.totalCostUsd ?? 0) * 10000) / 10000,
        }))

    // Duration over time
    const durationOverTime = executions.slice(0, 10).reverse().map((r, i) => ({
      name: r.startedAt ? new Date(r.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `Run ${i + 1}`,
      seconds: Math.round(r.totalDurationMs / 1000),
    }))

    // Confidence distribution
    const confidenceBuckets = { high: 0, medium: 0, low: 0 }
    for (const c of allConfidences) {
      if (c >= 0.9) confidenceBuckets.high++
      else if (c >= 0.7) confidenceBuckets.medium++
      else confidenceBuckets.low++
    }
    const confidenceDist = [
      { name: 'High (>90%)', value: confidenceBuckets.high, color: COLORS.emerald },
      { name: 'Medium (70-90%)', value: confidenceBuckets.medium, color: COLORS.amber },
      { name: 'Low (<70%)', value: confidenceBuckets.low, color: COLORS.red },
    ].filter(d => d.value > 0)

    // Node type breakdown from execution steps
    const nodeTypeCount: Record<string, number> = {}
    for (const run of executions) {
      for (const step of run.steps) {
        const nodeType = step.nodeType ?? 'unknown'
        nodeTypeCount[nodeType] = (nodeTypeCount[nodeType] || 0) + 1
      }
    }
    const nodeTypeData = Object.entries(nodeTypeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))

    // Error trend from platform metrics
    const errorTrendData = platformMetrics?.errorTrend?.length
      ? platformMetrics.errorTrend.slice(-14).map(d => ({ name: d.date.slice(5), errors: d.errors }))
      : []

    // Trigger type distribution
    const triggerData = platformMetrics?.executionsByTrigger
      ? Object.entries(platformMetrics.executionsByTrigger).map(([name, value]) => ({ name, value }))
      : []

    // Top workflows
    const topWorkflows = platformMetrics?.topWorkflowsByExecutions ?? []

    const satisfactionScore = Math.min(100, Math.round(70 + avgConfidence * 30))
    const resolvedToday = completedRuns.length + resolvedApprovals.filter(r => r.status === 'approved').length

    return {
      totalRuns,
      successRate,
      avgDuration,
      totalCost,
      avgConfidence,
      escalationRate,
      pendingApprovals: pendingApprovals.length,
      resolvedToday,
      satisfactionScore,
      statusData,
      costOverTime,
      durationOverTime,
      confidenceDist,
      nodeTypeData,
      errorTrendData,
      triggerData,
      topWorkflows,
      failedRuns: failedRuns.length,
      completedRuns: completedRuns.length,
      totalWorkflows: platformMetrics?.totalWorkflows ?? workflows.length,
      activeWorkflows: platformMetrics?.activeWorkflows ?? 0,
      totalTokensUsed: platformMetrics?.totalTokensUsed ?? 0,
    }
  }, [executions, approvals, platformMetrics, workflows])

  // ─── Recent Activity from DB Executions ─────────
  const recentActivity = useMemo(() => {
    return executions.slice(0, 8).map((r) => ({
      id: r.runId,
      workflowId: r.workflowId,
      workflowName: r.workflowName,
      status: r.status,
      duration: Math.round(r.totalDurationMs / 1000),
      cost: r.totalCostUsd,
      steps: r.steps?.length ?? 0,
      time: r.startedAt,
      triggeredBy: r.triggeredBy,
    }))
  }, [executions])

  // ─── Pending Approvals ─────────────────────────
  const pendingApprovalsList = useMemo(() => {
    return approvals.filter(a => a.status === 'pending')
  }, [approvals])

  // ─── Unread Notifications ──────────────────────
  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => !n.isRead)
  }, [notifications])

  // ─── Loading State ─────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-zinc-400">Loading AI Employee Dashboard...</p>
          <p className="text-xs text-zinc-600">Fetching data from APIs</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto px-6 py-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
        {/* Header with live status & refresh */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">AI Employee Dashboard</h1>
            <p className="text-xs text-zinc-500">
              {lastRefreshed
                ? `Last updated ${lastRefreshed.toLocaleTimeString()}`
                : 'Real-time performance metrics'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              {isLiveConnected ? (
                <><Wifi className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">Live</span></>
              ) : (
                <><WifiOff className="h-3.5 w-3.5 text-zinc-600" /><span className="text-zinc-600">Offline</span></>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAllData(true)}
              disabled={isRefreshing}
              className="h-8 text-xs border-zinc-800 hover:bg-zinc-800 shadow-[0_0_10px_rgba(255,255,255,0.05)] transition-all hover:scale-105 active:scale-95"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Error Banner */}
        {fetchError && (
          <Card className="bg-red-950/30 border-red-500/30">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="text-xs text-red-300">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={() => fetchAllData(true)} className="ml-auto h-6 text-[10px] border-red-500/30 text-red-300 hover:bg-red-950/50">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Real-time Metrics Row */}
        {realtimeMetrics && (
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-950/50 border border-zinc-800/80 shadow-none">
              <div className={`h-2 w-2 rounded-full ${realtimeMetrics.activeExecutions > 0 ? 'bg-blue-500 animate-pulse' : 'bg-zinc-700'}`} />
              <div>
                <p className="text-xs text-zinc-500">Active Now</p>
                <p className="text-sm font-semibold text-zinc-200">{realtimeMetrics.activeExecutions}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-950/50 border border-zinc-800/80 shadow-none">
              <CheckCircle2 className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Completed (1h)</p>
                <p className="text-sm font-semibold text-zinc-200">{realtimeMetrics.recentCompletions}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-950/50 border border-zinc-800/80 shadow-none">
              <AlertTriangle className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Errors (5m)</p>
                <p className="text-sm font-semibold text-zinc-200">{realtimeMetrics.recentErrors}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-950/50 border border-zinc-800/80 shadow-none">
              <Clock className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Avg Response</p>
                <p className="text-sm font-semibold text-zinc-200">{realtimeMetrics.avgResponseTime > 0 ? `${(realtimeMetrics.avgResponseTime / 1000).toFixed(1)}s` : '—'}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Resolved Today"
            value={metrics.resolvedToday}
            icon={CheckCircle2}
            color="emerald"
            trend={metrics.resolvedToday > 0 ? 'up' : 'neutral'}
            trendLabel={`${metrics.completedRuns} completed runs`}
          />
          <MetricCard
            title="Escalated"
            value={metrics.pendingApprovals}
            icon={AlertTriangle}
            color="amber"
            trendLabel={`${metrics.escalationRate}% escalation rate`}
          />
          <MetricCard
            title="Avg Confidence"
            value={metrics.avgConfidence > 0 ? `${(metrics.avgConfidence * 100).toFixed(0)}%` : '—'}
            icon={Target}
            color="cyan"
            trend={metrics.avgConfidence >= 0.9 ? 'up' : metrics.avgConfidence >= 0.7 ? 'neutral' : metrics.avgConfidence > 0 ? 'down' : undefined}
            trendLabel={metrics.avgConfidence >= 0.9 ? 'High confidence' : metrics.avgConfidence >= 0.7 ? 'Moderate confidence' : metrics.avgConfidence > 0 ? 'Needs review' : 'No data yet'}
          />
          <MetricCard
            title="Total Cost"
            value={`$${metrics.totalCost.toFixed(4)}`}
            icon={DollarSign}
            color="violet"
            trendLabel={`${metrics.totalRuns} total runs`}
          />
        </div>

        {/* Second Row Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Success Rate"
            value={`${metrics.successRate}%`}
            icon={TrendingUp}
            color="emerald"
            trend={metrics.successRate >= 80 ? 'up' : metrics.totalRuns > 0 ? 'down' : undefined}
            trendLabel={metrics.totalRuns > 0 ? `${metrics.failedRuns} failed` : 'No executions yet'}
          />
          <MetricCard
            title="Avg Runtime"
            value={metrics.avgDuration > 0 ? `${(metrics.avgDuration / 1000).toFixed(1)}s` : '—'}
            icon={Clock}
            color="blue"
          />
          <MetricCard
            title="Satisfaction"
            value={metrics.totalRuns > 0 ? `${metrics.satisfactionScore}%` : '—'}
            icon={Users}
            color="cyan"
            trend={metrics.satisfactionScore >= 80 ? 'up' : 'neutral'}
          />
          <MetricCard
            title="Workflows"
            value={metrics.totalWorkflows}
            icon={Workflow}
            color="violet"
            trendLabel={`${metrics.activeWorkflows} active`}
          />
        </div>

        {/* Pending Approvals Section */}
        {pendingApprovalsList.length > 0 && (
          <Card className="bg-amber-950/20 border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Pending Approvals ({pendingApprovalsList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingApprovalsList.slice(0, 5).map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-zinc-200 truncate">
                          Approval Required
                        </p>
                        {approval.assignee && (
                          <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-400">
                            {approval.assignee}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        Node: {approval.nodeId} &middot; Run: {approval.runId.slice(0, 16)}...
                        {approval.slaDeadline && (
                          <span className="text-amber-400 ml-2">SLA: {new Date(approval.slaDeadline).toLocaleTimeString()}</span>
                        )}
                      </p>
                      {approval.context && typeof approval.context === 'object' && (
                        <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                          {approval.context.question || approval.context.summary || JSON.stringify(approval.context).slice(0, 100)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50"
                        disabled={actionLoading[approval.id]}
                        onClick={() => handleApproval(approval.id, 'approved')}
                      >
                        {actionLoading[approval.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] border-red-500/30 text-red-400 hover:bg-red-950/50"
                        disabled={actionLoading[approval.id]}
                        onClick={() => handleApproval(approval.id, 'rejected')}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingApprovalsList.length > 5 && (
                  <Link href="/audit" className="block text-center text-xs text-cyan-400 hover:underline pt-1">
                    View all {pendingApprovalsList.length} pending approvals &rarr;
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-zinc-800">Overview</TabsTrigger>
            <TabsTrigger value="cost" className="text-xs data-[state=active]:bg-zinc-800">Cost & Duration</TabsTrigger>
            <TabsTrigger value="confidence" className="text-xs data-[state=active]:bg-zinc-800">Confidence</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-zinc-800">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Distribution */}
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-cyan-400" />
                    Run Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={metrics.statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {metrics.statusData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-600 text-xs">
                      No execution data yet. Run a workflow to see metrics.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Node Type Breakdown or Trigger Types */}
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-400" />
                    {metrics.triggerData.length > 0 ? 'Executions by Trigger' : 'Node Types Executed'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(metrics.triggerData.length > 0 ? metrics.triggerData : metrics.nodeTypeData).length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={metrics.triggerData.length > 0 ? metrics.triggerData : metrics.nodeTypeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                        />
                        <Bar dataKey="value" fill={COLORS.cyan} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-600 text-xs">
                      No execution data yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Workflows */}
            {metrics.topWorkflows.length > 0 && (
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-emerald-400" />
                    Top Workflows by Executions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {metrics.topWorkflows.slice(0, 5).map((wf, i) => (
                      <Link key={wf.workflowId} href={`/build?workflowId=${wf.workflowId}`} className="block">
                        <div className="flex items-center justify-between p-2 rounded-lg border border-zinc-800 bg-zinc-950/30 hover:border-cyan-500/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-600 w-4">#{i + 1}</span>
                            <span className="text-xs font-medium text-zinc-200 truncate max-w-[200px]">{wf.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400">
                              {wf.executions} runs
                            </Badge>
                            <Eye className="h-3 w-3 text-zinc-600" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cost" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cost Over Time */}
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    Cost Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.costOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={metrics.costOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                          formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                        />
                        <Area type="monotone" dataKey="cost" stroke={COLORS.emerald} fill={COLORS.emerald} fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-600 text-xs">
                      No cost data yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Duration Over Time */}
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-400" />
                    Runtime Per Run (seconds)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.durationOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={metrics.durationOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                          formatter={(value: number) => [`${value}s`, 'Duration']}
                        />
                        <Area type="monotone" dataKey="seconds" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-600 text-xs">
                      No duration data yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Error Trend */}
            {metrics.errorTrendData.length > 0 && (
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Error Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={metrics.errorTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                      />
                      <Bar dataKey="errors" fill={COLORS.red} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Token Usage */}
            {metrics.totalTokensUsed > 0 && (
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-violet-400" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Total Tokens Used</p>
                      <p className="text-xs text-zinc-500">Across all AI node executions</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-violet-400">{metrics.totalTokensUsed.toLocaleString()}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="confidence" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Confidence Distribution */}
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                    Confidence Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.confidenceDist.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={metrics.confidenceDist}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {metrics.confidenceDist.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#e4e4e7' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-600 text-xs">
                      No confidence data yet. Run a workflow with AI nodes.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Confidence Threshold Guide */}
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-400" />
                    Confidence Routing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-emerald-400 font-medium">High Confidence (Auto-send)</span>
                        <span className="text-xs text-zinc-500">&gt;90%</span>
                      </div>
                      <Progress value={metrics.confidenceDist.find(d => d.name === 'High (>90%)')?.value ?? 0} className="h-2 bg-zinc-800" />
                      <p className="text-[10px] text-zinc-600 mt-1">Response sent automatically, no human review needed</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-amber-400 font-medium">Medium (Human Review)</span>
                        <span className="text-xs text-zinc-500">70-90%</span>
                      </div>
                      <Progress value={metrics.confidenceDist.find(d => d.name === 'Medium (70-90%)')?.value ?? 0} className="h-2 bg-zinc-800" />
                      <p className="text-[10px] text-zinc-600 mt-1">Routed to approval queue for human verification</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-red-400 font-medium">Low (Escalation)</span>
                        <span className="text-xs text-zinc-500">&lt;70%</span>
                      </div>
                      <Progress value={metrics.confidenceDist.find(d => d.name === 'Low (<70%)')?.value ?? 0} className="h-2 bg-zinc-800" />
                      <p className="text-[10px] text-zinc-600 mt-1">Requires immediate human intervention</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-500">
                      Configure confidence thresholds per AI node in the workflow builder.
                      The default threshold is 90% — responses below this are flagged for review.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {/* Recent Executions from DB */}
            <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  Recent Execution Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950/50">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            activity.status === 'success' ? 'bg-emerald-500' :
                            activity.status === 'error' ? 'bg-red-500' :
                            activity.status === 'awaiting_approval' ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`} />
                          <div>
                            <p className="text-xs font-medium text-zinc-200">
                              {activity.workflowName || (
                                activity.status === 'success' ? 'Completed' :
                                activity.status === 'error' ? 'Failed' :
                                activity.status === 'awaiting_approval' ? 'Awaiting Approval' :
                                'Running'
                              )}
                            </p>
                            <p className="text-[10px] text-zinc-600 font-mono">
                              {activity.id.slice(0, 20)}...
                              {activity.triggeredBy && <span className="text-zinc-700 ml-2">via {activity.triggeredBy}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-zinc-400">{activity.steps} steps</p>
                            <p className="text-[10px] text-zinc-600">{activity.duration}s</p>
                          </div>
                          {activity.cost !== undefined && (
                            <div className="text-right">
                              <p className="text-xs text-violet-400">${activity.cost.toFixed(4)}</p>
                            </div>
                          )}
                          <Badge variant="outline" className={`text-[9px] ${
                            activity.status === 'success' ? 'border-emerald-500/30 text-emerald-400' :
                            activity.status === 'error' ? 'border-red-500/30 text-red-400' :
                            activity.status === 'awaiting_approval' ? 'border-amber-500/30 text-amber-400' :
                            'border-blue-500/30 text-blue-400'
                          }`}>
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-600 text-xs">
                    No execution activity yet. Run a workflow to see activity here.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            {unreadNotifications.length > 0 && (
              <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-400" />
                    Unread Notifications ({unreadNotifications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {unreadNotifications.slice(0, 5).map((n) => (
                      <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg border border-zinc-800 bg-zinc-950/30">
                        <div className={`h-2 w-2 rounded-full mt-1 ${
                          n.priority === 'high' ? 'bg-red-500' :
                          n.priority === 'normal' ? 'bg-amber-500' :
                          'bg-zinc-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-200 truncate">{n.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{n.message}</p>
                        </div>
                        <span className="text-[9px] text-zinc-600 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Bottom Section: Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/build">
            <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none hover:border-cyan-500/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Build Workflow</p>
                  <p className="text-[10px] text-zinc-500">Create or edit AI employee workflows</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/build?ai=true">
            <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none hover:border-violet-500/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">AI Generate</p>
                  <p className="text-[10px] text-zinc-500">Describe a workflow, AI builds it</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/audit">
            <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none hover:border-amber-500/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Review Approvals</p>
                  <p className="text-[10px] text-zinc-500">{metrics.pendingApprovals} pending human reviews</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/analytics">
            <Card className="bg-zinc-950/50 border-zinc-800/80 shadow-none hover:border-emerald-500/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Full Analytics</p>
                  <p className="text-[10px] text-zinc-500">Detailed workflow & cost analytics</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
    </motion.div>
  )
}
