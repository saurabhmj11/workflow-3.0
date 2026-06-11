'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, DollarSign, Clock,
  Zap, AlertTriangle, CheckCircle2, Activity,
  Bot, Shield, Brain, Target, Timer, Database, Inbox,
  RefreshCw, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

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

interface WorkflowMetrics {
  workflowId: string
  totalExecutions: number
  successRate: number
  avgDurationMs: number
  avgCostUsd: number
  totalCostUsd: number
  last24h: { executions: number; successRate: number; avgDurationMs: number; errors: number; costUsd: number }
  last7d: { executions: number; successRate: number; avgDurationMs: number; errors: number; costUsd: number }
  nodeTypeBreakdown: Record<string, { count: number; avgDurationMs: number; errorRate: number }>
  hourlyTimeline: Array<{ hour: string; executions: number; errors: number; avgDuration: number; cost: number }>
}

interface ExecutionRecord {
  id: string
  workflowId: string
  workflowName?: string
  runId: string
  status: string
  triggeredBy: string
  steps: Array<{ nodeType?: string; status?: string; output?: any; startedAt?: string; finishedAt?: string; tokenUsage?: { prompt?: number; completion?: number }; costUsd?: number; error?: string }>
  totalDurationMs: number
  totalCostUsd: number
  error?: string
  startedAt: string
  finishedAt?: string
}

const COLORS = {
  emerald: '#10b981',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
}

// ─── Icon map ────────────────────────────────────
const WORKFLOW_ICONS: Record<string, typeof Bot> = {
  'AI Support Employee': Bot,
  'SDR Employee': Target,
  'Incident Responder': Shield,
  'Recruiter': Brain,
}

function getDefaultIcon(name: string) {
  for (const [key, icon] of Object.entries(WORKFLOW_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon
  }
  return Activity
}

// ─── MiniSparkline ────────────────────────────────
function MiniSparkline({ data, color = '#8b5cf6', height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) {
    return (
      <svg width={120} height={height} className="inline-block">
        <text x={60} y={height / 2 + 4} textAnchor="middle" fill="#64748b" fontSize={10}>—</text>
      </svg>
    )
  }
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
}

// ─── ROI Calculator ──────────────────────────────
function ROICalculator() {
  const [ticketsPerMonth, setTicketsPerMonth] = useState(500)
  const beforeCost = ticketsPerMonth * 2.80
  const afterCost = ticketsPerMonth * 0.42
  const monthlySavings = beforeCost - afterCost
  const annualSavings = monthlySavings * 12
  const savingsPercent = Math.round(((beforeCost - afterCost) / beforeCost) * 100)
  const hoursSaved = Math.round(ticketsPerMonth * 0.25)

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          ROI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Monthly tickets</label>
          <input
            type="range"
            min={50}
            max={5000}
            step={50}
            value={ticketsPerMonth}
            onChange={(e) => setTicketsPerMonth(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>50</span>
            <span className="text-white font-medium">{ticketsPerMonth.toLocaleString()}</span>
            <span>5,000</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Before</div>
            <div className="text-red-400 font-bold">${beforeCost.toLocaleString()}/mo</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">After</div>
            <div className="text-emerald-400 font-bold">${afterCost.toLocaleString()}/mo</div>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/20">
            <div className="text-xs text-emerald-400 mb-1">Savings</div>
            <div className="text-emerald-400 font-bold">{savingsPercent}%</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-violet-500/10 rounded-lg p-4 border border-violet-500/20">
            <div className="text-xs text-violet-300 mb-1">Annual Savings</div>
            <div className="text-2xl font-bold text-violet-400">${annualSavings.toLocaleString()}</div>
          </div>
          <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
            <div className="text-xs text-cyan-300 mb-1">Hours Saved/Month</div>
            <div className="text-2xl font-bold text-cyan-400">{hoursSaved}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 mb-6">
        <Database className="h-12 w-12 text-slate-600" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">No execution data yet</h2>
      <p className="text-slate-400 max-w-md mb-6">
        Run a workflow to see real analytics here. Metrics will be computed from your actual execution results.
      </p>
      <div className="flex gap-3">
        <Link href="/builder">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Zap className="h-4 w-4 mr-2" />
            Build a Workflow
          </Button>
        </Link>
        <Link href="/demo">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
            Watch Demo
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ─── Main Analytics Page ──────────────────────────
export default function AnalyticsPage() {
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null)
  const [workflowMetricsMap, setWorkflowMetricsMap] = useState<Map<string, WorkflowMetrics>>(new Map())
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      const [analyticsRes, executionsRes] = await Promise.allSettled([
        fetch('/api/analytics'),
        fetch('/api/executions?limit=100'),
      ])

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.ok) {
        const json = await analyticsRes.value.json()
        if (json.ok) {
          setPlatformMetrics(json.data.platform)
        }
      }

      if (executionsRes.status === 'fulfilled' && executionsRes.value.ok) {
        const json = await executionsRes.value.json()
        if (json.ok && Array.isArray(json.data)) {
          setExecutions(json.data)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch per-workflow metrics for top workflows
  useEffect(() => {
    if (!platformMetrics?.topWorkflowsByExecutions?.length) return
    const topIds = platformMetrics.topWorkflowsByExecutions.slice(0, 5).map(w => w.workflowId)
    Promise.allSettled(
      topIds.map(id => fetch(`/api/analytics/${id}`).then(r => r.json()))
    ).then(results => {
      const newMap = new Map<string, WorkflowMetrics>()
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value?.ok && res.value?.data) {
          const m = res.value.data as WorkflowMetrics
          newMap.set(m.workflowId, m)
        }
      }
      setWorkflowMetricsMap(newMap)
    })
  }, [platformMetrics?.topWorkflowsByExecutions])

  const hasData = executions.length > 0 || (platformMetrics?.totalExecutions ?? 0) > 0

  // Compute all metrics from real data
  const { totalRuns, successRate, avgConfidence, totalCost, escalationRate, costByNodeType, failureReasons } = useMemo(() => {
    const totalRuns = platformMetrics?.totalExecutions ?? executions.length
    const successCount = executions.filter(r => r.status === 'success').length
    const escalationCount = executions.filter(r => r.status === 'awaiting_approval').length
    const totalCost = platformMetrics?.totalCostUsd ?? executions.reduce((a, r) => a + (r.totalCostUsd ?? 0), 0)

    // Confidence from AI node outputs
    const allSteps = executions.flatMap(r => r.steps ?? [])
    const confidences: number[] = []
    for (const step of allSteps) {
      const output = step.output as Record<string, unknown> | undefined
      if (output && typeof output === 'object' && 'confidence' in output && typeof output.confidence === 'number') {
        confidences.push(output.confidence)
      }
    }
    const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0

    // Cost by node type
    const byType = new Map<string, { costs: number[]; totalCost: number }>()
    for (const step of allSteps) {
      const nodeType = step.nodeType || 'unknown'
      const cost = step.costUsd ?? 0
      const entry = byType.get(nodeType) ?? { costs: [], totalCost: 0 }
      entry.costs.push(cost)
      entry.totalCost += cost
      byType.set(nodeType, entry)
    }
    const grandTotal = Array.from(byType.values()).reduce((a, e) => a + e.totalCost, 0)
    const costByNodeType = Array.from(byType.entries()).map(([type, data]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      avgCost: data.costs.length > 0 ? data.totalCost / data.costs.length : 0,
      runs: data.costs.length,
      totalCost: data.totalCost,
      percentage: grandTotal > 0 ? (data.totalCost / grandTotal) * 100 : 0,
    })).sort((a, b) => b.totalCost - a.totalCost)

    // Failure reasons
    const reasons = new Map<string, number>()
    for (const step of allSteps) {
      if (step.status === 'error' && step.error) {
        let reason = step.error
        if (reason.toLowerCase().includes('timeout')) reason = 'API Timeout'
        else if (reason.toLowerCase().includes('rate limit') || reason.toLowerCase().includes('429')) reason = 'Rate Limit Hit'
        else if (reason.toLowerCase().includes('auth') || reason.toLowerCase().includes('token')) reason = 'Auth Token Expired'
        else if (reason.toLowerCase().includes('confidence')) reason = 'Low Confidence Escalation'
        else {
          reason = reason.length > 60 ? reason.slice(0, 57) + '...' : reason
        }
        reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
      }
    }
    const total = Array.from(reasons.values()).reduce((a, b) => a + b, 0)
    const failureReasons = Array.from(reasons.entries())
      .map(([reason, count]) => ({ reason, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)

    return {
      totalRuns,
      successRate: platformMetrics?.successRate
        ? platformMetrics.successRate * 100
        : totalRuns > 0 ? (successCount / totalRuns) * 100 : 0,
      avgConfidence,
      totalCost,
      escalationRate: totalRuns > 0 ? (escalationCount / totalRuns) * 100 : 0,
      costByNodeType,
      failureReasons,
    }
  }, [executions, platformMetrics])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
          <p className="text-sm text-zinc-400">Loading Analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-zinc-100">Workflow Analytics</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="h-8 text-xs border-zinc-800 hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Top Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-violet-400" />
                    <span className="text-xs text-slate-500">Total Runs</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{totalRuns.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-slate-500">Success Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{successRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="h-4 w-4 text-violet-400" />
                    <span className="text-xs text-slate-500">Avg Confidence</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{avgConfidence > 0 ? `${(avgConfidence * 100).toFixed(0)}%` : '—'}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-slate-500">Total Cost</span>
                  </div>
                  <div className="text-2xl font-bold text-white">${totalCost.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-xs text-slate-500">Escalation Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{escalationRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="employees" className="space-y-6">
              <TabsList className="bg-slate-900 border-slate-800">
                <TabsTrigger value="employees">Per Workflow</TabsTrigger>
                <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
                <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="roi">ROI</TabsTrigger>
              </TabsList>

              {/* Per Workflow Tab */}
              <TabsContent value="employees" className="space-y-4">
                {platformMetrics?.topWorkflowsByExecutions?.length ? platformMetrics.topWorkflowsByExecutions.map((wf) => {
                  const metrics = workflowMetricsMap.get(wf.workflowId)
                  const Icon = getDefaultIcon(wf.name)
                  const colors = [
                    { color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
                    { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
                    { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
                    { color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
                    { color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
                  ]
                  const c = colors[platformMetrics.topWorkflowsByExecutions.indexOf(wf) % colors.length]

                  // Build sparkline data from hourly timeline
                  const costTrend = metrics?.hourlyTimeline?.slice(-14).map(h => h.cost) ?? []
                  const execTrend = metrics?.hourlyTimeline?.slice(-14).map(h => h.executions) ?? []

                  return (
                    <Card key={wf.workflowId} className="bg-slate-900/50 border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${c.bgColor}`}>
                              <Icon className={`h-5 w-5 ${c.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{wf.name}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                                  {wf.executions.toLocaleString()} runs
                                </Badge>
                                <Activity className="h-3 w-3 text-slate-500" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Cost trend</div>
                              <MiniSparkline data={costTrend.length > 1 ? costTrend : [0, wf.executions * 0.01]} color="#10b981" />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Success</div>
                            <div className="text-sm font-semibold text-emerald-400">
                              {metrics ? `${(metrics.successRate * 100).toFixed(1)}%` : '—'}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Avg Cost</div>
                            <div className="text-sm font-semibold text-white">
                              ${metrics ? metrics.avgCostUsd.toFixed(3) : '—'}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Avg Time</div>
                            <div className="text-sm font-semibold text-white">
                              {metrics ? `${(metrics.avgDurationMs / 1000).toFixed(1)}s` : '—'}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Last 24h</div>
                            <div className="text-sm font-semibold text-cyan-400">
                              {metrics ? `${metrics.last24h.executions} runs` : '—'}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Errors (7d)</div>
                            <div className="text-sm font-semibold text-amber-400">
                              {metrics ? metrics.last7d.errors : '—'}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Node Types</div>
                            <div className="text-sm font-semibold text-white">
                              {metrics ? Object.keys(metrics.nodeTypeBreakdown).length : '—'}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Total Cost</div>
                            <div className="text-sm font-semibold text-white">
                              ${metrics ? metrics.totalCostUsd.toFixed(2) : '—'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                }) : (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-8 text-center">
                      <Inbox className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No workflow execution data to display yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Cost Breakdown Tab */}
              <TabsContent value="costs" className="space-y-4">
                {/* Cost by Day Chart */}
                {platformMetrics?.costByDay?.length ? (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        Daily Cost Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={platformMetrics.costByDay.slice(-30)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                          <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#e4e4e7' }}
                            formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
                          />
                          <Area type="monotone" dataKey="cost" stroke={COLORS.emerald} fill={COLORS.emerald} fillOpacity={0.15} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-violet-400" />
                      Cost by Node Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {costByNodeType.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          {costByNodeType.map((node) => (
                            <div key={node.type} className="flex items-center gap-4">
                              <div className="w-28 text-sm text-slate-300 font-medium">{node.type}</div>
                              <div className="flex-1 bg-slate-800/50 rounded-full h-6 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
                                  style={{ width: `${Math.max(node.percentage, 1)}%` }}
                                />
                              </div>
                              <div className="w-16 text-sm text-right text-slate-400">{node.percentage.toFixed(1)}%</div>
                              <div className="w-20 text-sm text-right text-white font-medium">${node.totalCost.toFixed(2)}</div>
                              <div className="w-20 text-sm text-right text-slate-500">{node.runs.toLocaleString()} runs</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                          <span className="text-sm text-slate-400">Total</span>
                          <span className="text-lg font-bold text-white">
                            ${costByNodeType.reduce((a, n) => a + n.totalCost, 0).toFixed(2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <Inbox className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No cost data available yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Trigger Distribution */}
                {platformMetrics?.executionsByTrigger && Object.keys(platformMetrics.executionsByTrigger).length > 0 && (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="h-5 w-5 text-cyan-400" />
                        Executions by Trigger Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={Object.entries(platformMetrics.executionsByTrigger).map(([name, value]) => ({ name, value }))} layout="vertical">
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
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Failure Analysis Tab */}
              <TabsContent value="failures" className="space-y-4">
                {/* Error Trend Chart */}
                {platformMetrics?.errorTrend?.length ? (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        Error Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={platformMetrics.errorTrend.slice(-30)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
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
                ) : null}

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                      Failure Reasons
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {failureReasons.length > 0 ? (
                      <div className="space-y-3">
                        {failureReasons.map((reason) => (
                          <div key={reason.reason} className="flex items-center gap-4">
                            <div className="w-48 text-sm text-slate-300 truncate" title={reason.reason}>{reason.reason}</div>
                            <div className="flex-1 bg-slate-800/50 rounded-full h-6 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                                style={{ width: `${reason.percentage}%` }}
                              />
                            </div>
                            <div className="w-16 text-sm text-right text-slate-400">{reason.percentage.toFixed(1)}%</div>
                            <div className="w-16 text-sm text-right text-white">{reason.count}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                        <p className="text-slate-400">No failures recorded — everything is running smoothly!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4">
                {executions.length > 0 ? (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-cyan-400" />
                        Recent Executions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {executions.slice(0, 20).map((exec) => (
                          <div key={exec.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/30">
                            <div className="flex items-center gap-3">
                              <div className={`h-2 w-2 rounded-full ${
                                exec.status === 'success' ? 'bg-emerald-500' :
                                exec.status === 'error' ? 'bg-red-500' :
                                exec.status === 'awaiting_approval' ? 'bg-amber-500' :
                                'bg-blue-500'
                              }`} />
                              <div>
                                <p className="text-sm text-slate-300">{exec.workflowName || exec.workflowId}</p>
                                <p className="text-xs text-slate-600 font-mono">
                                  {exec.runId.slice(0, 20)}... via {exec.triggeredBy}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-slate-500">
                                {(exec.totalDurationMs / 1000).toFixed(1)}s
                              </span>
                              <span className="text-xs text-violet-400">
                                ${exec.totalCostUsd.toFixed(4)}
                              </span>
                              <Badge variant="outline" className={`text-[9px] ${
                                exec.status === 'success' ? 'border-emerald-500/30 text-emerald-400' :
                                exec.status === 'error' ? 'border-red-500/30 text-red-400' :
                                'border-amber-500/30 text-amber-400'
                              }`}>
                                {exec.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-8 text-center">
                      <Inbox className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No execution data yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ROI Tab */}
              <TabsContent value="roi">
                <div className="grid md:grid-cols-2 gap-6">
                  <ROICalculator />
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                        Before vs After
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 font-medium pb-2 border-b border-slate-800">
                        <div>Metric</div>
                        <div className="text-center">Before</div>
                        <div className="text-center">After</div>
                        <div className="text-right">Change</div>
                      </div>
                      {[
                        { label: 'Avg Response Time', before: '10.5 min', after: '2.3 min', improvement: '78% faster' },
                        { label: 'Cost per Ticket', before: '$2.80', after: '$0.42', improvement: '85% cheaper' },
                        { label: 'Auto-Resolution', before: '0%', after: '73%', improvement: '+73 pts' },
                        { label: 'Customer Satisfaction', before: '3.9/5', after: '4.8/5', improvement: '+23%' },
                        { label: 'Escalation Rate', before: '35%', after: '12%', improvement: '-66%' },
                      ].map((row) => (
                        <div key={row.label} className="grid grid-cols-4 gap-2 items-center">
                          <div className="text-sm text-slate-400">{row.label}</div>
                          <div className="text-sm text-red-400 text-center">{row.before}</div>
                          <div className="text-sm text-emerald-400 text-center">{row.after}</div>
                          <div className="text-xs text-violet-400 font-medium text-right">{row.improvement}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
    </div>
  )
}
