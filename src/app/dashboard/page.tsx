'use client'

import { useMemo, useState, useEffect } from 'react'
import { useExecutionStore } from '@/stores/execution-store'
import { useApprovalStore } from '@/stores/approval-store'
import { useWorkflowStore } from '@/stores/workflow-store'
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
} from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

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

const PIE_COLORS = [COLORS.emerald, COLORS.amber, COLORS.red, COLORS.cyan, COLORS.violet]

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
  const colorMap: Record<string, string> = {
    cyan: 'from-cyan-500/10 border-cyan-500/20 text-cyan-400',
    emerald: 'from-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 border-amber-500/20 text-amber-400',
    violet: 'from-violet-500/10 border-violet-500/20 text-violet-400',
    red: 'from-red-500/10 border-red-500/20 text-red-400',
    blue: 'from-blue-500/10 border-blue-500/20 text-blue-400',
  }
  const colorClass = colorMap[color] ?? colorMap.cyan

  return (
    <Card className={`bg-gradient-to-br ${colorClass.split(' ')[0]} to-transparent border ${colorClass.split(' ')[1]}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass.split(' ')[2]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-100">{value}</div>
        {(subtitle || trendLabel) && (
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
            {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-400" />}
            <span className={`text-xs ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500'
            }`}>
              {trendLabel || subtitle}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Dashboard Page ─────────────────────────
export default function AIEmployeeDashboard() {
  const results = useExecutionStore((s) => s.results)
  const approvalRequests = useApprovalStore((s) => s.requests)
  const [isLoading, setIsLoading] = useState(true)

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  // ─── Compute Metrics ────────────────────────────
  const metrics = useMemo(() => {
    const completedRuns = results.filter(r => r.status === 'success')
    const failedRuns = results.filter(r => r.status === 'error')
    const pendingApprovals = approvalRequests.filter(r => r.status === 'pending')
    const resolvedApprovals = approvalRequests.filter(r => r.status !== 'pending')

    // Total runs
    const totalRuns = results.length

    // Success rate
    const successRate = totalRuns > 0 ? Math.round((completedRuns.length / totalRuns) * 100) : 0

    // Average duration
    const avgDuration = completedRuns.length > 0
      ? Math.round(completedRuns.reduce((acc, r) => acc + r.totalDurationMs, 0) / completedRuns.length)
      : 0

    // Total cost
    const totalCost = results.reduce((acc, r) => acc + (r.totalCostUsd ?? 0), 0)

    // Average confidence
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

    // Escalation rate
    const escalationRate = totalRuns > 0
      ? Math.round((approvalRequests.length / totalRuns) * 100)
      : 0

    // Runs by status
    const statusData = [
      { name: 'Success', value: completedRuns.length, color: COLORS.emerald },
      { name: 'Failed', value: failedRuns.length, color: COLORS.red },
      { name: 'Awaiting', value: results.filter(r => r.status === 'awaiting_approval').length, color: COLORS.amber },
      { name: 'Running', value: results.filter(r => r.status === 'running').length, color: COLORS.blue },
    ].filter(d => d.value > 0)

    // Cost over time (last 10 runs)
    const costOverTime = results.slice(0, 10).reverse().map((r, i) => ({
      name: `Run ${i + 1}`,
      cost: Math.round((r.totalCostUsd ?? 0) * 10000) / 10000,
      duration: Math.round(r.totalDurationMs / 1000),
    }))

    // Duration over time
    const durationOverTime = results.slice(0, 10).reverse().map((r, i) => ({
      name: `Run ${i + 1}`,
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

    // Node type breakdown
    const nodeTypeCount: Record<string, number> = {}
    for (const run of results) {
      for (const step of run.steps) {
        nodeTypeCount[step.nodeType] = (nodeTypeCount[step.nodeType] || 0) + 1
      }
    }
    const nodeTypeData = Object.entries(nodeTypeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))

    // Customer satisfaction (simulated — would be from real data)
    const satisfactionScore = Math.min(100, Math.round(70 + avgConfidence * 30))

    // Resolved today (simulated)
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
      failedRuns: failedRuns.length,
      completedRuns: completedRuns.length,
    }
  }, [results, approvalRequests])

  // ─── Recent Activity ────────────────────────────
  const recentActivity = useMemo(() => {
    return results.slice(0, 8).map((r) => ({
      id: r.runId,
      status: r.status,
      duration: Math.round(r.totalDurationMs / 1000),
      cost: r.totalCostUsd,
      steps: r.steps.length,
      time: r.startedAt,
    }))
  }, [results])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-zinc-400">Loading AI Employee Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
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
            value={`${(metrics.avgConfidence * 100).toFixed(0)}%`}
            icon={Target}
            color="cyan"
            trend={metrics.avgConfidence >= 0.9 ? 'up' : metrics.avgConfidence >= 0.7 ? 'neutral' : 'down'}
            trendLabel={metrics.avgConfidence >= 0.9 ? 'High confidence' : metrics.avgConfidence >= 0.7 ? 'Moderate confidence' : 'Needs review'}
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
            trend={metrics.successRate >= 80 ? 'up' : 'down'}
            trendLabel={`${metrics.failedRuns} failed`}
          />
          <MetricCard
            title="Avg Runtime"
            value={`${metrics.avgDuration / 1000}s`}
            icon={Clock}
            color="blue"
          />
          <MetricCard
            title="Satisfaction"
            value={`${metrics.satisfactionScore}%`}
            icon={Users}
            color="cyan"
            trend={metrics.satisfactionScore >= 80 ? 'up' : 'neutral'}
          />
          <MetricCard
            title="AI Nodes Run"
            value={metrics.nodeTypeData.reduce((acc, d) => acc + d.value, 0)}
            icon={Brain}
            color="violet"
          />
        </div>

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
              <Card className="bg-zinc-900/80 border-zinc-800">
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
                        <Legend
                          wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-600 text-xs">
                      No execution data yet. Run a workflow to see metrics.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Node Type Breakdown */}
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-400" />
                    Node Types Executed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.nodeTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={metrics.nodeTypeData} layout="vertical">
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
                      No node execution data yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cost" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cost Over Time */}
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    Cost Per Run
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
              <Card className="bg-zinc-900/80 border-zinc-800">
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
          </TabsContent>

          <TabsContent value="confidence" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Confidence Distribution */}
              <Card className="bg-zinc-900/80 border-zinc-800">
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
              <Card className="bg-zinc-900/80 border-zinc-800">
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
            <Card className="bg-zinc-900/80 border-zinc-800">
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
                              {activity.status === 'success' ? 'Completed' :
                               activity.status === 'error' ? 'Failed' :
                               activity.status === 'awaiting_approval' ? 'Awaiting Approval' :
                               'Running'}
                            </p>
                            <p className="text-[10px] text-zinc-600 font-mono">
                              {activity.id.slice(0, 20)}...
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
          </TabsContent>
        </Tabs>

        {/* Bottom Section: Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/builder">
            <Card className="bg-zinc-900/80 border-zinc-800 hover:border-cyan-500/30 transition-colors cursor-pointer">
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
          <Link href="/builder">
            <Card className="bg-zinc-900/80 border-zinc-800 hover:border-violet-500/30 transition-colors cursor-pointer">
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
          <Link href="/dashboard">
            <Card className="bg-zinc-900/80 border-zinc-800 hover:border-amber-500/30 transition-colors cursor-pointer">
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
        </div>
    </div>
  )
}
