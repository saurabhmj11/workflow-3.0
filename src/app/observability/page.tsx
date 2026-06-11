'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity, ArrowLeft, Clock, CheckCircle2, XCircle,
  Loader2, Search, Eye, ChevronDown, ChevronUp, Zap,
  Timer, AlertTriangle, BarChart3, FileText,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────

interface TraceInfo {
  id: string
  workflowId: string
  runId: string
  startTime: string
  endTime: string | null
  durationMs: number | null
  status: string
  spanCount: number
  totalTokenUsage: number
  totalCostUsd: number
}

interface TraceStats {
  totalTraces: number
  avgDurationMs: number
  errorRate: number
  totalTokens: number
  totalCost: number
}

interface SpanInfo {
  id: string
  traceId: string
  parentId: string | null
  name: string
  kind: string
  startTime: string
  endTime: string | null
  durationMs: number | null
  status: string
  attributes: Record<string, unknown>
  events: Array<{ name: string; timestamp: string; attributes?: Record<string, unknown> }>
}

interface LogEntry {
  id: string
  level: string
  message: string
  timestamp: string
  traceId?: string
  runId?: string
  workflowId?: string
  metadata?: Record<string, unknown>
}

// ─── Level Config ───────────────────────────────────

const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  error: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: XCircle },
  warn: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
  info: { color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', icon: Activity },
  debug: { color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20', icon: Search },
}

const STATUS_COLORS: Record<string, string> = {
  ok: 'text-emerald-400',
  error: 'text-red-400',
  running: 'text-cyan-400',
}

// ─── Time Helpers ───────────────────────────────────

function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Span Tree Component ────────────────────────────

function SpanTree({ spans, parentId = null, depth = 0 }: { spans: SpanInfo[]; parentId?: string | null; depth?: number }) {
  const children = spans.filter(s => s.parentId === parentId)
  if (children.length === 0) return null

  return (
    <div>
      {children.map(span => (
        <div key={span.id}>
          <div
            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-zinc-800/50"
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
          >
            {depth > 0 && (
              <div className="text-zinc-700 text-xs">└─</div>
            )}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <div className={`h-2 w-2 rounded-full ${span.status === 'ok' ? 'bg-emerald-400' : span.status === 'error' ? 'bg-red-400' : 'bg-cyan-400'}`} />
              <span className="text-xs text-zinc-200 truncate">{span.name}</span>
              <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500 shrink-0">
                {span.kind}
              </Badge>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
              {formatDuration(span.durationMs)}
            </span>
          </div>
          <SpanTree spans={spans} parentId={span.id} depth={depth + 1} />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────

export default function ObservabilityPage() {
  const [traces, setTraces] = useState<TraceInfo[]>([])
  const [stats, setStats] = useState<TraceStats | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [logCounts, setLogCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [traceDetail, setTraceDetail] = useState<{ spans: SpanInfo[] } | null>(null)
  const [levelFilter, setLevelFilter] = useState<string>('')

  const fetchTraces = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/traces')
      const json = await res.json()
      if (json.ok) {
        setTraces(json.data.traces)
        setStats(json.data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch traces:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (levelFilter) params.set('level', levelFilter)
      params.set('limit', '200')
      const res = await fetch(`/api/observability/logs?${params}`)
      const json = await res.json()
      if (json.ok) {
        setLogs(json.data.logs)
        setLogCounts(json.data.countsByLevel)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
  }, [levelFilter])

  const fetchTraceDetail = useCallback(async (traceId: string) => {
    try {
      const res = await fetch(`/api/observability/traces/${traceId}`)
      const json = await res.json()
      if (json.ok) {
        setTraceDetail(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch trace detail:', err)
    }
  }, [])

  useEffect(() => { fetchTraces() }, [fetchTraces])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSelectTrace = useCallback((traceId: string) => {
    if (selectedTraceId === traceId) {
      setSelectedTraceId(null)
      setTraceDetail(null)
    } else {
      setSelectedTraceId(traceId)
      fetchTraceDetail(traceId)
    }
  }, [selectedTraceId, fetchTraceDetail])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
          <p className="text-sm text-zinc-400">Loading observability data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">Observability</h1>
              <p className="text-xs text-zinc-500">Traces, logs, and platform metrics</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-[11px] text-zinc-400 hover:text-zinc-200" onClick={() => { fetchTraces(); fetchLogs() }}>
            <Activity className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-zinc-500">Total Traces</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{stats?.totalTraces ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-zinc-500">Avg Duration</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{stats ? formatDuration(stats.avgDurationMs) : '—'}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-zinc-500">Error Rate</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{stats ? `${(stats.errorRate * 100).toFixed(1)}%` : '—'}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-zinc-500">Total Tokens</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">
                {stats ? (stats.totalTokens > 1000 ? `${(stats.totalTokens / 1000).toFixed(0)}K` : stats.totalTokens) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">Total Cost</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{stats ? `$${stats.totalCost.toFixed(2)}` : '—'}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="traces" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="traces" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Traces
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Logs
            </TabsTrigger>
          </TabsList>

          {/* Traces Tab */}
          <TabsContent value="traces" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Traces List */}
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-400" />
                    Recent Traces
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    {traces.length === 0 ? (
                      <div className="py-12 text-center">
                        <Activity className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                        <p className="text-xs text-zinc-500">No traces yet. Execute a workflow to generate traces.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800/50">
                        {traces.map(trace => (
                          <button
                            key={trace.id}
                            className={`w-full text-left p-3 hover:bg-zinc-800/30 transition-colors ${
                              selectedTraceId === trace.id ? 'bg-violet-900/20 border-l-2 border-violet-500' : ''
                            }`}
                            onClick={() => handleSelectTrace(trace.id)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`h-2 w-2 rounded-full shrink-0 ${
                                  trace.status === 'ok' ? 'bg-emerald-400' :
                                  trace.status === 'error' ? 'bg-red-400' : 'bg-cyan-400'
                                }`} />
                                <span className="text-xs text-zinc-200 truncate">{trace.workflowId}</span>
                              </div>
                              <span className={`text-xs font-mono shrink-0 ml-2 ${STATUS_COLORS[trace.status] ?? 'text-zinc-400'}`}>
                                {formatDuration(trace.durationMs)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                              <span>{trace.spanCount} spans</span>
                              <span>{formatTime(trace.startTime)}</span>
                              {trace.totalTokenUsage > 0 && (
                                <span>{trace.totalTokenUsage} tokens</span>
                              )}
                              {trace.totalCostUsd > 0 && (
                                <span className="text-emerald-400">${trace.totalCostUsd.toFixed(3)}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Trace Detail */}
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-cyan-400" />
                    Trace Detail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!selectedTraceId ? (
                    <div className="py-12 text-center">
                      <Eye className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">Select a trace to view details</p>
                    </div>
                  ) : !traceDetail ? (
                    <div className="py-12 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-400 mx-auto" />
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[470px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                          <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400">
                            {selectedTraceId.slice(0, 12)}...
                          </Badge>
                          <span className="text-[10px] text-zinc-500">{traceDetail.spans.length} spans</span>
                        </div>
                        <SpanTree spans={traceDetail.spans} />
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            {/* Level Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Filter:</span>
              <Button
                variant={levelFilter === '' ? 'default' : 'outline'}
                size="sm"
                className={`h-7 text-[10px] ${levelFilter === '' ? 'bg-violet-600 text-white' : 'border-zinc-700 text-zinc-400'}`}
                onClick={() => setLevelFilter('')}
              >
                All ({Object.values(logCounts).reduce((a, b) => a + b, 0)})
              </Button>
              {Object.entries(LEVEL_CONFIG).map(([level, config]) => {
                const count = logCounts[level] ?? 0
                if (count === 0) return null
                const Icon = config.icon
                return (
                  <Button
                    key={level}
                    variant={levelFilter === level ? 'default' : 'outline'}
                    size="sm"
                    className={`h-7 text-[10px] ${levelFilter === level ? 'bg-violet-600 text-white' : `border-zinc-700 ${config.color}`}`}
                    onClick={() => setLevelFilter(level)}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {level} ({count})
                  </Button>
                )
              })}
            </div>

            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardContent className="p-0">
                <ScrollArea className="max-h-[500px]">
                  {logs.length === 0 ? (
                    <div className="py-12 text-center">
                      <FileText className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No logs found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/30">
                      {logs.map((log) => {
                        const config = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info
                        const Icon = config.icon
                        return (
                          <div key={log.id} className="p-2.5 hover:bg-zinc-800/30">
                            <div className="flex items-start gap-2">
                              <div className={`h-5 px-1.5 rounded border flex items-center gap-1 shrink-0 ${config.bg}`}>
                                <Icon className={`h-2.5 w-2.5 ${config.color}`} />
                                <span className={`text-[9px] font-semibold uppercase ${config.color}`}>
                                  {log.level}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-zinc-200 font-mono break-all">{log.message}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] text-zinc-600">{formatTime(log.timestamp)}</span>
                                  {log.traceId && (
                                    <span className="text-[9px] text-violet-400 font-mono">trace: {log.traceId.slice(0, 12)}...</span>
                                  )}
                                  {log.workflowId && (
                                    <span className="text-[9px] text-cyan-400 font-mono">{log.workflowId.slice(0, 16)}...</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
