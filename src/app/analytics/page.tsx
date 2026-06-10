'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Clock,
  Zap, AlertTriangle, CheckCircle2, Activity, ArrowRight,
  Bot, Shield, Brain, Target, Timer, Database, Inbox
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useExecutionStore } from '@/stores/execution-store'
import { useApprovalStore } from '@/stores/approval-store'
import type { ExecutionResult, NodeExecutionStep } from '@/lib/types'
import { getCategoryForType } from '@/lib/types'

// ─── Icon map for per-workflow display ────────────
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

// ─── Compute metrics from real execution results ──

interface PerWorkflowStats {
  workflowId: string
  workflowName: string
  icon: typeof Bot
  color: string
  bgColor: string
  runs: number
  successRate: number
  avgCost: number
  avgDurationMs: number
  avgConfidence: number
  escalationRate: number
  tokensUsed: number
  totalCost: number
  steps: NodeExecutionStep[]
}

function computePerWorkflowStats(results: ExecutionResult[]): PerWorkflowStats[] {
  const byWorkflow = new Map<string, ExecutionResult[]>()
  for (const r of results) {
    const key = r.workflowId || 'unknown'
    const list = byWorkflow.get(key) ?? []
    list.push(r)
    byWorkflow.set(key, list)
  }

  const colors = [
    { color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
    { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    { color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    { color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
    { color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  ]

  const stats: PerWorkflowStats[] = []
  let colorIdx = 0
  for (const [workflowId, runs] of byWorkflow) {
    const totalRuns = runs.length
    const successRuns = runs.filter(r => r.status === 'success').length
    const escalationRuns = runs.filter(r => r.status === 'awaiting_approval').length
    const totalCost = runs.reduce((a, r) => a + (r.totalCostUsd ?? 0), 0)
    const totalDuration = runs.reduce((a, r) => a + r.totalDurationMs, 0)

    const allSteps = runs.flatMap(r => r.steps)
    const tokensUsed = allSteps.reduce((a, s) => {
      if (!s.tokenUsage) return a
      return a + (s.tokenUsage.prompt ?? 0) + (s.tokenUsage.completion ?? 0)
    }, 0)

    // Confidence from AI node outputs
    const confidences: number[] = []
    for (const step of allSteps) {
      const output = step.output as Record<string, unknown> | undefined
      if (output && typeof output === 'object' && 'confidence' in output && typeof output.confidence === 'number') {
        confidences.push(output.confidence)
      }
    }
    const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0

    const workflowName = workflowId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const c = colors[colorIdx % colors.length]
    colorIdx++

    stats.push({
      workflowId,
      workflowName,
      icon: getDefaultIcon(workflowName),
      color: c.color,
      bgColor: c.bgColor,
      runs: totalRuns,
      successRate: totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0,
      avgCost: totalRuns > 0 ? totalCost / totalRuns : 0,
      avgDurationMs: totalRuns > 0 ? totalDuration / totalRuns : 0,
      avgConfidence,
      escalationRate: totalRuns > 0 ? (escalationRuns / totalRuns) * 100 : 0,
      tokensUsed,
      totalCost,
      steps: allSteps,
    })
  }
  return stats
}

interface CostByNodeType {
  type: string
  avgCost: number
  runs: number
  totalCost: number
  percentage: number
}

function computeCostByNodeType(results: ExecutionResult[]): CostByNodeType[] {
  const byType = new Map<string, { costs: number[]; totalCost: number }>()
  for (const r of results) {
    for (const step of r.steps) {
      const nodeType = step.nodeType || 'unknown'
      const cost = step.costUsd ?? 0
      const entry = byType.get(nodeType) ?? { costs: [], totalCost: 0 }
      entry.costs.push(cost)
      entry.totalCost += cost
      byType.set(nodeType, entry)
    }
  }

  const items: CostByNodeType[] = []
  const grandTotal = Array.from(byType.values()).reduce((a, e) => a + e.totalCost, 0)
  for (const [type, data] of byType) {
    const category = getCategoryForType(type as any)
    const label = category.category === 'ai' ? type.toUpperCase() : `${type.charAt(0).toUpperCase() + type.slice(1)} Action`
    items.push({
      type: label,
      avgCost: data.costs.length > 0 ? data.totalCost / data.costs.length : 0,
      runs: data.costs.length,
      totalCost: data.totalCost,
      percentage: grandTotal > 0 ? (data.totalCost / grandTotal) * 100 : 0,
    })
  }

  items.sort((a, b) => b.totalCost - a.totalCost)
  return items
}

interface FailureReason {
  reason: string
  count: number
  percentage: number
}

function computeFailureReasons(results: ExecutionResult[]): FailureReason[] {
  const reasons = new Map<string, number>()
  for (const r of results) {
    for (const step of r.steps) {
      if (step.status === 'error' && step.error) {
        // Normalize error messages into categories
        let reason = step.error
        if (reason.toLowerCase().includes('timeout')) reason = 'API Timeout'
        else if (reason.toLowerCase().includes('rate limit') || reason.toLowerCase().includes('429')) reason = 'Rate Limit Hit'
        else if (reason.toLowerCase().includes('auth') || reason.toLowerCase().includes('token') || reason.toLowerCase().includes('unauthorized')) reason = 'Auth Token Expired'
        else if (reason.toLowerCase().includes('confidence') || reason.toLowerCase().includes('escalat')) reason = 'Low Confidence Escalation'
        else if (reason.toLowerCase().includes('invalid') || reason.toLowerCase().includes('format') || reason.toLowerCase().includes('parse')) reason = 'Invalid Input Format'
        else {
          // Truncate long errors
          reason = reason.length > 60 ? reason.slice(0, 57) + '...' : reason
        }
        reasons.set(reason, (reasons.get(reason) ?? 0) + 1)
      }
    }
  }

  const total = Array.from(reasons.values()).reduce((a, b) => a + b, 0)
  const items = Array.from(reasons.entries())
    .map(([reason, count]) => ({ reason, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count)
  return items
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

// ─── ROI Calculator (kept as-is) ──────────────────

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
  const results = useExecutionStore((s) => s.results)
  const approvalRequests = useApprovalStore((s) => s.requests)

  const hasData = results.length > 0

  // Compute all metrics from real data
  const { totalRuns, successRate, avgConfidence, totalCost, escalationRate, workflowStats, costByNodeType, failureReasons } = useMemo(() => {
    const totalRuns = results.length
    const successCount = results.filter(r => r.status === 'success').length
    const escalationCount = results.filter(r => r.status === 'awaiting_approval').length
    const totalCost = results.reduce((a, r) => a + (r.totalCostUsd ?? 0), 0)

    // Confidence from AI node outputs
    const allSteps = results.flatMap(r => r.steps)
    const confidences: number[] = []
    for (const step of allSteps) {
      const output = step.output as Record<string, unknown> | undefined
      if (output && typeof output === 'object' && 'confidence' in output && typeof output.confidence === 'number') {
        confidences.push(output.confidence)
      }
    }
    const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0

    return {
      totalRuns,
      successRate: totalRuns > 0 ? (successCount / totalRuns) * 100 : 0,
      avgConfidence,
      totalCost,
      escalationRate: totalRuns > 0 ? (escalationCount / totalRuns) * 100 : 0,
      workflowStats: computePerWorkflowStats(results),
      costByNodeType: computeCostByNodeType(results),
      failureReasons: computeFailureReasons(results),
    }
  }, [results])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-bold text-white">OpenWorkflow</Link>
            <div className="flex gap-6">
              <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">Dashboard</Link>
              <Link href="/builder" className="text-sm text-slate-400 hover:text-white transition-colors">Builder</Link>
              <Link href="/analytics" className="text-sm text-violet-400 font-medium">Analytics</Link>
              <Link href="/integrations" className="text-sm text-slate-400 hover:text-white transition-colors">Integrations</Link>
              <Link href="/memory" className="text-sm text-slate-400 hover:text-white transition-colors">Memory</Link>
              <Link href="/demo" className="text-sm text-slate-400 hover:text-white transition-colors">Demo</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Workflow Analytics</h1>
          <p className="text-slate-400">Cost, performance, and ROI across all AI employees</p>
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
                <TabsTrigger value="employees">Per Employee</TabsTrigger>
                <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
                <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
                <TabsTrigger value="roi">ROI</TabsTrigger>
              </TabsList>

              {/* Per Employee Tab */}
              <TabsContent value="employees" className="space-y-4">
                {workflowStats.length > 0 ? workflowStats.map((emp) => {
                  const Icon = emp.icon
                  // Build sparkline data from individual results (last 14 runs)
                  const recentResults = results
                    .filter(r => r.workflowId === emp.workflowId)
                    .slice(0, 14)
                    .reverse()
                  const dailyRuns = recentResults.map(() => 1) // Each result is one run
                  const dailyCost = recentResults.map(r => r.totalCostUsd ?? 0)

                  return (
                    <Card key={emp.workflowId} className="bg-slate-900/50 border-slate-800">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${emp.bgColor}`}>
                              <Icon className={`h-5 w-5 ${emp.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{emp.workflowName}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                                  {emp.runs.toLocaleString()} runs
                                </Badge>
                                <Activity className="h-3 w-3 text-slate-500" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Cost trend</div>
                              <MiniSparkline data={dailyCost} color="#10b981" />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Success</div>
                            <div className="text-sm font-semibold text-emerald-400">{emp.successRate.toFixed(1)}%</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Avg Cost</div>
                            <div className="text-sm font-semibold text-white">${emp.avgCost.toFixed(3)}</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Avg Time</div>
                            <div className="text-sm font-semibold text-white">{(emp.avgDurationMs / 1000).toFixed(1)}s</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Confidence</div>
                            <div className="text-sm font-semibold text-violet-400">
                              {emp.avgConfidence > 0 ? `${(emp.avgConfidence * 100).toFixed(0)}%` : '—'}
                            </div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Escalation</div>
                            <div className="text-sm font-semibold text-amber-400">{emp.escalationRate.toFixed(1)}%</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Tokens</div>
                            <div className="text-sm font-semibold text-white">{emp.tokensUsed > 1000 ? `${(emp.tokensUsed / 1000).toFixed(0)}K` : emp.tokensUsed}</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="text-xs text-slate-500">Total Cost</div>
                            <div className="text-sm font-semibold text-white">${emp.totalCost.toFixed(2)}</div>
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
              </TabsContent>

              {/* Failure Analysis Tab */}
              <TabsContent value="failures" className="space-y-4">
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

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Timer className="h-5 w-5 text-cyan-400" />
                      Escalation Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {escalationRate > 0 ? (
                      <div className="space-y-3">
                        {results
                          .filter(r => r.status === 'awaiting_approval')
                          .slice(0, 5)
                          .map((r) => (
                            <div key={r.runId} className="flex items-center gap-4 bg-slate-800/30 rounded-lg p-3">
                              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-slate-300 truncate">
                                  {r.workflowId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {r.steps.length} steps · {r.totalDurationMs > 0 ? `${(r.totalDurationMs / 1000).toFixed(1)}s` : 'In progress'}
                                  {(r.totalCostUsd ?? 0) > 0 && ` · $${(r.totalCostUsd ?? 0).toFixed(3)}`}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 shrink-0">
                                Awaiting Approval
                              </Badge>
                            </div>
                          ))}
                        {results.filter(r => r.status === 'awaiting_approval').length > 5 && (
                          <p className="text-xs text-slate-500 text-center">
                            +{results.filter(r => r.status === 'awaiting_approval').length - 5} more escalations
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                        <p className="text-slate-400">No escalations recorded — all runs are flowing smoothly.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
    </div>
  )
}
