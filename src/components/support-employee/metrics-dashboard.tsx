'use client'

import {
  Clock, CheckCircle2, Star, DollarSign, TrendingDown, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import { DEMO_METRICS, type DemoMetric } from '@/lib/demo-data'

const ICON_MAP: Record<string, typeof Clock> = {
  Clock, CheckCircle2, Star, DollarSign, TrendingDown, BarChart3,
}

function ChangeIndicator({ change, type }: { change: string; type: DemoMetric['changeType'] }) {
  if (type === 'positive') {
    return (
      <span className="flex items-center gap-0.5 text-emerald-400 font-medium" style={{ fontSize: '10px' }}>
        <ArrowDownRight className="h-3 w-3" />
        {change}
      </span>
    )
  }
  if (type === 'negative') {
    return (
      <span className="flex items-center gap-0.5 text-red-400 font-medium" style={{ fontSize: '10px' }}>
        <ArrowUpRight className="h-3 w-3" />
        {change}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-zinc-500 font-medium" style={{ fontSize: '10px' }}>
      <Minus className="h-3 w-3" />
      {change}
    </span>
  )
}

function MiniSparkline({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  const bars = trend === 'up'
    ? [20, 35, 25, 50, 40, 65, 55, 80, 70, 90]
    : trend === 'down'
    ? [90, 80, 70, 65, 55, 45, 40, 35, 25, 20]
    : [50, 55, 45, 52, 48, 55, 50, 52, 48, 50]

  const color = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b'

  return (
    <div className="flex items-end gap-px h-6">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-t-sm transition-all"
          style={{
            height: h + '%',
            backgroundColor: color,
            opacity: 0.3 + (i / bars.length) * 0.7,
          }}
        />
      ))}
    </div>
  )
}

function MetricCard({ metric, trend }: { metric: DemoMetric; trend: 'up' | 'down' | 'flat' }) {
  const Icon = ICON_MAP[metric.icon] || Clock
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
        <ChangeIndicator change={metric.change} type={metric.changeType} />
      </div>
      <div>
        <p className="text-lg font-bold text-zinc-100 leading-none">{metric.value}</p>
        <p className="text-zinc-500 mt-0.5" style={{ fontSize: '10px' }}>{metric.label}</p>
      </div>
      <MiniSparkline trend={trend} />
    </div>
  )
}

export function MetricsDashboard() {
  const trends: ('up' | 'down' | 'flat')[] = ['down', 'up', 'up', 'down', 'down', 'flat']

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
          AI Employee Performance
        </h3>
        <span className="text-zinc-500" style={{ fontSize: '9px' }}>Last 30 days</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DEMO_METRICS.map((metric, i) => (
          <MetricCard key={metric.label} metric={metric} trend={trends[i] || 'flat'} />
        ))}
      </div>

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
        <p className="text-cyan-400 font-medium mb-1" style={{ fontSize: '10px' }}>Before vs. After AI Employee</p>
        <div className="grid grid-cols-2 gap-4" style={{ fontSize: '10px' }}>
          <div>
            <p className="text-zinc-500 mb-1">Before (human-only)</p>
            <div className="space-y-0.5">
              <p className="text-zinc-400">Avg response: <span className="text-zinc-300">10.4 min</span></p>
              <p className="text-zinc-400">Cost/ticket: <span className="text-zinc-300">$2.80</span></p>
              <p className="text-zinc-400">Resolution: <span className="text-zinc-300">45%</span></p>
            </div>
          </div>
          <div>
            <p className="text-zinc-500 mb-1">After (AI + human)</p>
            <div className="space-y-0.5">
              <p className="text-zinc-400">Avg response: <span className="text-emerald-400 font-medium">2.3 min</span></p>
              <p className="text-zinc-400">Cost/ticket: <span className="text-emerald-400 font-medium">$0.42</span></p>
              <p className="text-zinc-400">Resolution: <span className="text-emerald-400 font-medium">73%</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
