'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Clock,
  Zap, AlertTriangle, CheckCircle2, Activity, ArrowRight,
  Bot, Shield, Brain, Target, Timer
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const employeeStats = [
  {
    name: 'AI Support Employee',
    icon: Bot,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    runs: 1247,
    successRate: 96.2,
    avgCost: 0.042,
    avgDuration: 2.3,
    avgConfidence: 0.93,
    escalationRate: 8.2,
    tokensUsed: 312400,
    totalCost: 52.37,
    trend: 'up' as const,
    dailyRuns: [42, 38, 51, 47, 53, 49, 55, 61, 58, 63, 59, 67, 64, 71],
    dailyCost: [1.8, 1.6, 2.1, 1.9, 2.2, 2.0, 2.3, 2.5, 2.4, 2.6, 2.4, 2.8, 2.6, 2.9],
  },
  {
    name: 'SDR Employee',
    icon: Target,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    runs: 892,
    successRate: 78.4,
    avgCost: 0.038,
    avgDuration: 4.1,
    avgConfidence: 0.81,
    escalationRate: 21.6,
    tokensUsed: 223000,
    totalCost: 33.90,
    trend: 'up' as const,
    dailyRuns: [28, 31, 25, 33, 30, 35, 32, 38, 34, 37, 36, 40, 38, 42],
    dailyCost: [1.1, 1.2, 0.9, 1.3, 1.1, 1.3, 1.2, 1.4, 1.3, 1.4, 1.4, 1.5, 1.4, 1.6],
  },
  {
    name: 'Incident Responder',
    icon: Shield,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    runs: 234,
    successRate: 91.5,
    avgCost: 0.055,
    avgDuration: 1.8,
    avgConfidence: 0.89,
    escalationRate: 8.5,
    tokensUsed: 58500,
    totalCost: 12.87,
    trend: 'flat' as const,
    dailyRuns: [8, 12, 6, 15, 10, 7, 11, 9, 13, 8, 10, 14, 7, 11],
    dailyCost: [0.4, 0.7, 0.3, 0.8, 0.6, 0.4, 0.6, 0.5, 0.7, 0.4, 0.6, 0.8, 0.4, 0.6],
  },
]

const topExpensiveNodes = [
  { type: 'LLM', avgCost: 0.028, runs: 1847, totalCost: 51.72, percentage: 52.3 },
  { type: 'Classifier', avgCost: 0.002, runs: 2139, totalCost: 4.28, percentage: 4.3 },
  { type: 'RAG', avgCost: 0.015, runs: 1247, totalCost: 18.71, percentage: 18.9 },
  { type: 'Agent', avgCost: 0.035, runs: 391, totalCost: 13.69, percentage: 13.8 },
  { type: 'Summarizer', avgCost: 0.008, runs: 892, totalCost: 7.14, percentage: 7.2 },
  { type: 'Approval', avgCost: 0, runs: 289, totalCost: 0, percentage: 0 },
  { type: 'Email Action', avgCost: 0.001, runs: 1839, totalCost: 1.84, percentage: 1.9 },
  { type: 'Slack Action', avgCost: 0.001, runs: 412, totalCost: 0.41, percentage: 0.4 },
]

const failureReasons = [
  { reason: 'API Timeout', count: 23, percentage: 38.3 },
  { reason: 'Low Confidence Escalation', count: 18, percentage: 30.0 },
  { reason: 'Invalid Input Format', count: 9, percentage: 15.0 },
  { reason: 'Rate Limit Hit', count: 6, percentage: 10.0 },
  { reason: 'Auth Token Expired', count: 4, percentage: 6.7 },
]

function MiniSparkline({ data, color = '#8b5cf6', height = 32 }: { data: number[]; color?: string; height?: number }) {
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

export default function AnalyticsPage() {
  const totalRuns = employeeStats.reduce((a, e) => a + e.runs, 0)
  const totalCost = employeeStats.reduce((a, e) => a + e.totalCost, 0)
  const avgSuccess = employeeStats.reduce((a, e) => a + e.successRate, 0) / employeeStats.length
  const avgConfidence = employeeStats.reduce((a, e) => a + e.avgConfidence, 0) / employeeStats.length
  const avgEscalation = employeeStats.reduce((a, e) => a + e.escalationRate, 0) / employeeStats.length

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
              <div className="text-2xl font-bold text-white">{avgSuccess.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-slate-500">Avg Confidence</span>
              </div>
              <div className="text-2xl font-bold text-white">{(avgConfidence * 100).toFixed(0)}%</div>
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
              <div className="text-2xl font-bold text-white">{avgEscalation.toFixed(1)}%</div>
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
            {employeeStats.map((emp) => {
              const Icon = emp.icon
              return (
                <Card key={emp.name} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${emp.bgColor}`}>
                          <Icon className={`h-5 w-5 ${emp.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{emp.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                              {emp.runs.toLocaleString()} runs
                            </Badge>
                            {emp.trend === 'up' ? (
                              <TrendingUp className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Activity className="h-3 w-3 text-slate-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Runs (14d)</div>
                          <MiniSparkline data={emp.dailyRuns} color="#8b5cf6" />
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Cost (14d)</div>
                          <MiniSparkline data={emp.dailyCost} color="#10b981" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Success</div>
                        <div className="text-sm font-semibold text-emerald-400">{emp.successRate}%</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Avg Cost</div>
                        <div className="text-sm font-semibold text-white">${emp.avgCost.toFixed(3)}</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Avg Time</div>
                        <div className="text-sm font-semibold text-white">{emp.avgDuration} min</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Confidence</div>
                        <div className="text-sm font-semibold text-violet-400">{(emp.avgConfidence * 100).toFixed(0)}%</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Escalation</div>
                        <div className="text-sm font-semibold text-amber-400">{emp.escalationRate}%</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Tokens</div>
                        <div className="text-sm font-semibold text-white">{(emp.tokensUsed / 1000).toFixed(0)}K</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Total Cost</div>
                        <div className="text-sm font-semibold text-white">${emp.totalCost.toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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
                <div className="space-y-3">
                  {topExpensiveNodes.map((node) => (
                    <div key={node.type} className="flex items-center gap-4">
                      <div className="w-28 text-sm text-slate-300 font-medium">{node.type}</div>
                      <div className="flex-1 bg-slate-800/50 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
                          style={{ width: `${Math.max(node.percentage, 1)}%` }}
                        />
                      </div>
                      <div className="w-16 text-sm text-right text-slate-400">{node.percentage}%</div>
                      <div className="w-20 text-sm text-right text-white font-medium">${node.totalCost.toFixed(2)}</div>
                      <div className="w-20 text-sm text-right text-slate-500">{node.runs.toLocaleString()} runs</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-sm text-slate-400">Total</span>
                  <span className="text-lg font-bold text-white">
                    ${topExpensiveNodes.reduce((a, n) => a + n.totalCost, 0).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Failure Analysis Tab */}
          <TabsContent value="failures" className="space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Failure Reasons (Last 30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {failureReasons.map((reason) => (
                    <div key={reason.reason} className="flex items-center gap-4">
                      <div className="w-48 text-sm text-slate-300">{reason.reason}</div>
                      <div className="flex-1 bg-slate-800/50 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                          style={{ width: `${reason.percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-sm text-right text-slate-400">{reason.percentage}%</div>
                      <div className="w-16 text-sm text-right text-white">{reason.count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Timer className="h-5 w-5 text-cyan-400" />
                  Escalation Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400 mb-4">Escalation rate by time of day and category</p>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 28 }, (_, i) => {
                    const intensity = Math.random()
                    const bg = intensity > 0.7 ? 'bg-amber-500' : intensity > 0.4 ? 'bg-amber-500/50' : 'bg-slate-800/50'
                    return <div key={i} className={`h-8 rounded ${bg}`} title={`${Math.round(intensity * 100)}%`} />
                  })}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <span>Low</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 rounded bg-slate-800/50" />
                    <div className="w-4 h-2 rounded bg-amber-500/50" />
                    <div className="w-4 h-2 rounded bg-amber-500" />
                  </div>
                  <span>High</span>
                </div>
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
      </div>
    </div>
  )
}
