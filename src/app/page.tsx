'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, Activity, Zap, TrendingUp, Clock,
  DollarSign, AlertTriangle, CheckCircle2, BarChart3,
  Wifi, WifiOff, Send, MessageSquare, MousePointer2,
  Circle, Radio, ArrowUpRight, ArrowDownRight, Timer,
  Brain, Shield, Target, Database, ChevronRight,
  Eye, UserPlus, LogOut, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useCollaborationStore } from '@/stores/collaboration-store'
import { useAnalyticsStore } from '@/stores/analytics-store'
import type { CollabUser } from '@/lib/collaboration'
import type { RealtimeMetrics } from '@/lib/analytics'

// ─── Color helpers ─────────────────────────────────

function getColorClass(hex: string): string {
  const map: Record<string, string> = {
    '#ef4444': 'bg-red-500', '#f97316': 'bg-orange-500', '#eab308': 'bg-amber-500',
    '#22c55e': 'bg-emerald-500', '#06b6d4': 'bg-cyan-500', '#8b5cf6': 'bg-violet-500',
    '#ec4899': 'bg-pink-500', '#14b8a6': 'bg-teal-500', '#f43f5e': 'bg-rose-500',
    '#a855f7': 'bg-purple-500',
  }
  return map[hex] ?? 'bg-violet-500'
}

// ─── Simulated Users for Demo ──────────────────────

const SIMULATED_USERS = [
  { id: 'user-alice', name: 'Alice Chen', color: '#22c55e' },
  { id: 'user-bob', name: 'Bob Martinez', color: '#06b6d4' },
  { id: 'user-carol', name: 'Carol Kim', color: '#ec4899' },
]

// ─── Collaboration Panel ───────────────────────────

function CollaborationPanel() {
  const {
    activeUsers, isConnected, myUserId, myColor, events, currentWorkflowId,
    connect, disconnect, sendChatMessage, sendCursorUpdate,
  } = useCollaborationStore()

  const [chatInput, setChatInput] = useState('')
  const [userName, setUserName] = useState('')
  const [workflowId, setWorkflowId] = useState('wf-demo-collab')
  const [isJoined, setIsJoined] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  // Track cursor position
  useEffect(() => {
    if (!isJoined) return
    const handleMouseMove = (e: MouseEvent) => {
      const x = Math.round(e.clientX)
      const y = Math.round(e.clientY)
      setCursorPos({ x, y })
      sendCursorUpdate({ x, y })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isJoined, sendCursorUpdate])

  const handleJoin = useCallback(() => {
    const name = userName.trim() || 'Anonymous'
    const id = `user-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
    connect(workflowId, id, name)
    setIsJoined(true)
  }, [userName, workflowId, connect])

  const handleLeave = useCallback(() => {
    disconnect()
    setIsJoined(false)
  }, [disconnect])

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return
    sendChatMessage(chatInput.trim())
    setChatInput('')
  }, [chatInput, sendChatMessage])

  const chatEvents = events.filter(e => e.type === 'chat')

  return (
    <Card className="bg-slate-900/50 border-slate-800 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-emerald-400" />
          Real-time Collaboration
          {isConnected && (
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 ml-auto">
              <Circle className="h-2 w-2 mr-1 fill-emerald-400" />
              LIVE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Join/Leave Controls */}
        {!isJoined ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Your Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="bg-slate-800 border-slate-700 text-white text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Workflow Room</label>
              <Input
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                placeholder="Workflow ID..."
                className="bg-slate-800 border-slate-700 text-white text-sm"
              />
            </div>
            <Button
              onClick={handleJoin}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Join Room
            </Button>
          </div>
        ) : (
          <>
            {/* Room info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-400">Room: {currentWorkflowId}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleLeave}
              >
                <LogOut className="h-3 w-3 mr-1" />
                Leave
              </Button>
            </div>

            {/* Active Users */}
            <div>
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Online ({activeUsers.length + 1})
              </div>
              <div className="flex flex-wrap gap-2">
                {myUserId && (
                  <div className="flex items-center gap-1.5 bg-slate-800/50 rounded-full px-2.5 py-1">
                    <div className={`h-3 w-3 rounded-full ${myColor ? getColorClass(myColor) : 'bg-violet-500'}`} />
                    <span className="text-xs text-white font-medium">You</span>
                  </div>
                )}
                {activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-1.5 bg-slate-800/50 rounded-full px-2.5 py-1">
                    <div className={`h-3 w-3 rounded-full ${getColorClass(user.color)}`} />
                    <span className="text-xs text-slate-300">{user.name}</span>
                    {user.cursor && (
                      <MousePointer2 className="h-2.5 w-2.5 text-slate-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cursor Position */}
            <div className="bg-slate-800/30 rounded-lg p-2.5 flex items-center gap-2">
              <MousePointer2 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs text-slate-400">
                Cursor: ({cursorPos.x}, {cursorPos.y})
              </span>
            </div>

            {/* Simulated Users */}
            <div>
              <div className="text-xs text-slate-500 mb-2">Simulated Collaborators</div>
              <div className="flex gap-2">
                {SIMULATED_USERS.map((su) => {
                  const isOnline = activeUsers.some(u => u.id === su.id)
                  return (
                    <Button
                      key={su.id}
                      variant="outline"
                      size="sm"
                      className={`h-7 text-xs ${
                        isOnline
                          ? 'border-emerald-500/30 text-emerald-400'
                          : 'border-slate-700 text-slate-500'
                      }`}
                      onClick={() => {
                        if (!isOnline) {
                          connect(workflowId + '-sim-' + su.id, su.id, su.name)
                        }
                      }}
                    >
                      <div className={`h-2 w-2 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      {su.name.split(' ')[0]}
                    </Button>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-slate-800" />

            {/* Chat */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Chat
              </div>
              <ScrollArea className="flex-1 max-h-48">
                <div className="space-y-2">
                  {chatEvents.length === 0 && (
                    <p className="text-xs text-slate-600 italic">No messages yet. Say hello!</p>
                  )}
                  {chatEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div
                        className={`h-4 w-4 rounded-full shrink-0 mt-0.5 ${getColorClass(
                          activeUsers.find(u => u.id === event.userId)?.color ?? '#8b5cf6'
                        )}`}
                      />
                      <div>
                        <span className="text-[10px] text-slate-500">
                          {activeUsers.find(u => u.id === event.userId)?.name ?? event.userId}
                        </span>
                        <p className="text-xs text-slate-300">
                          {event.data.message as string}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2 mt-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-slate-800 border-slate-700 text-white text-xs h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <Button
                  size="sm"
                  className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Event Feed */}
            <div>
              <div className="text-xs text-slate-500 mb-1">Recent Events</div>
              <ScrollArea className="max-h-24">
                <div className="space-y-1">
                  {events.slice(-8).reverse().map((event, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-700 text-slate-500">
                        {event.type}
                      </Badge>
                      <span className="text-slate-600 truncate">
                        {event.type === 'join' ? `${event.data.name} joined` :
                         event.type === 'leave' ? `${event.userId} left` :
                         event.type === 'cursor' ? 'cursor moved' :
                         event.type === 'chat' ? (event.data.message as string)?.slice(0, 30) :
                         `${event.type} event`}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Live Metrics Bar ─────────────────────────────

function LiveMetricsBar({ metrics, isConnected }: { metrics: RealtimeMetrics; isConnected: boolean }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <Wifi className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-slate-500" />
        )}
        <span className="text-xs text-slate-400">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Radio className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-xs text-slate-300">{metrics.activeExecutions}</span>
        <span className="text-xs text-slate-500">active</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-xs text-slate-300">{metrics.recentCompletions}</span>
        <span className="text-xs text-slate-500">completed/hr</span>
      </div>
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs text-slate-300">{metrics.recentErrors}</span>
        <span className="text-xs text-slate-500">errors</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Timer className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-xs text-slate-300">{metrics.avgResponseTime > 0 ? `${(metrics.avgResponseTime / 1000).toFixed(1)}s` : '—'}</span>
        <span className="text-xs text-slate-500">avg time</span>
      </div>
    </div>
  )
}

// ─── Metric Card ───────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  changeType,
  iconColor,
}: {
  icon: typeof Zap
  label: string
  value: string
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  iconColor: string
}) {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-xs text-slate-500">{label}</span>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            {changeType === 'positive' && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
            {changeType === 'negative' && <ArrowDownRight className="h-3 w-3 text-red-400" />}
            <span className={`text-xs ${changeType === 'positive' ? 'text-emerald-400' : changeType === 'negative' ? 'text-red-400' : 'text-slate-500'}`}>
              {change}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Mini Sparkline ────────────────────────────────

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

// ─── Analytics Dashboard ───────────────────────────

function AnalyticsDashboard() {
  const {
    platformMetrics, realtimeMetrics, isLoading, isLiveConnected,
    fetchPlatformMetrics, connectLive, disconnectLive,
  } = useAnalyticsStore()

  const [autoRefresh, setAutoRefresh] = useState(false)

  // Fetch metrics on mount
  useEffect(() => {
    fetchPlatformMetrics()
  }, [fetchPlatformMetrics])

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchPlatformMetrics, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchPlatformMetrics])

  const handleToggleLive = useCallback(() => {
    if (isLiveConnected) {
      disconnectLive()
    } else {
      connectLive()
    }
  }, [isLiveConnected, connectLive, disconnectLive])

  const pm = platformMetrics

  return (
    <Card className="bg-slate-900/50 border-slate-800 h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-violet-400" />
          Live Analytics Dashboard
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 text-xs ${autoRefresh ? 'text-emerald-400' : 'text-slate-500'}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`h-7 text-xs ${isLiveConnected ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-700 text-slate-400'}`}
              onClick={handleToggleLive}
            >
              {isLiveConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Connect
                </>
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Live Metrics Bar */}
        <div className="bg-slate-800/30 rounded-lg p-3">
          <LiveMetricsBar metrics={realtimeMetrics} isConnected={isLiveConnected} />
        </div>

        {isLoading && !pm ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 text-slate-600 animate-spin" />
          </div>
        ) : pm ? (
          <>
            {/* Top Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                icon={Zap}
                label="Total Executions"
                value={pm.totalExecutions.toLocaleString()}
                iconColor="text-violet-400"
              />
              <MetricCard
                icon={CheckCircle2}
                label="Success Rate"
                value={`${(pm.successRate * 100).toFixed(1)}%`}
                change={pm.successRate > 0.9 ? 'Healthy' : pm.successRate > 0.7 ? 'Fair' : 'At Risk'}
                changeType={pm.successRate > 0.9 ? 'positive' : pm.successRate > 0.7 ? 'neutral' : 'negative'}
                iconColor="text-emerald-400"
              />
              <MetricCard
                icon={DollarSign}
                label="Total Cost"
                value={`$${pm.totalCostUsd.toFixed(2)}`}
                iconColor="text-cyan-400"
              />
              <MetricCard
                icon={Clock}
                label="Avg Exec Time"
                value={pm.avgExecutionTime > 0 ? `${(pm.avgExecutionTime / 1000).toFixed(1)}s` : '—'}
                iconColor="text-amber-400"
              />
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard
                icon={Database}
                label="Total Workflows"
                value={pm.totalWorkflows.toLocaleString()}
                change={`${pm.activeWorkflows} active`}
                changeType="neutral"
                iconColor="text-emerald-400"
              />
              <MetricCard
                icon={Brain}
                label="Tokens Used"
                value={pm.totalTokensUsed > 1000000
                  ? `${(pm.totalTokensUsed / 1000000).toFixed(1)}M`
                  : pm.totalTokensUsed > 1000
                  ? `${(pm.totalTokensUsed / 1000).toFixed(0)}K`
                  : pm.totalTokensUsed.toString()}
                iconColor="text-violet-400"
              />
              <MetricCard
                icon={Activity}
                label="Trigger Types"
                value={Object.keys(pm.executionsByTrigger).length.toString()}
                change={`${Object.entries(pm.executionsByTrigger).map(([k, v]) => `${k}: ${v}`).join(', ')}`}
                changeType="neutral"
                iconColor="text-cyan-400"
              />
            </div>

            {/* Top Workflows */}
            {pm.topWorkflowsByExecutions.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Top Workflows by Executions
                </div>
                <div className="space-y-2">
                  {pm.topWorkflowsByExecutions.slice(0, 5).map((wf, i) => (
                    <div key={wf.workflowId} className="flex items-center gap-3 bg-slate-800/30 rounded-lg p-2.5">
                      <span className="text-xs text-slate-600 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white font-medium truncate">{wf.name}</div>
                        <div className="text-[10px] text-slate-500">{wf.workflowId.slice(0, 12)}...</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400 shrink-0">
                        {wf.executions} runs
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Trend */}
            {pm.costByDay.length > 1 && (
              <div>
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Cost Trend (Daily)
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <MiniSparkline data={pm.costByDay.map(d => d.cost)} color="#06b6d4" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                    <span>{pm.costByDay[0]?.date}</span>
                    <span>{pm.costByDay[pm.costByDay.length - 1]?.date}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Trend */}
            {pm.errorTrend.length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Error Trend
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3">
                  <MiniSparkline data={pm.errorTrend.map(d => d.errors)} color="#ef4444" height={24} />
                  <div className="text-xs text-slate-500 mt-1">
                    {pm.errorTrend.reduce((a, d) => a + d.errors, 0)} total errors across {pm.errorTrend.length} days
                  </div>
                </div>
              </div>
            )}

            {/* Executions by Trigger Type */}
            {Object.keys(pm.executionsByTrigger).length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Executions by Trigger
                </div>
                <div className="space-y-2">
                  {Object.entries(pm.executionsByTrigger).map(([trigger, count]) => {
                    const total = Object.values(pm.executionsByTrigger).reduce((a, b) => a + b, 0)
                    const pct = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div key={trigger} className="flex items-center gap-3">
                        <div className="w-20 text-xs text-slate-300 font-medium">{trigger}</div>
                        <div className="flex-1 bg-slate-800/50 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <div className="w-12 text-xs text-right text-slate-400">{pct.toFixed(0)}%</div>
                        <div className="w-8 text-xs text-right text-white">{count}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="h-10 w-10 text-slate-700 mb-3" />
            <p className="text-sm text-slate-400 mb-1">No analytics data yet</p>
            <p className="text-xs text-slate-600">Execute workflows to see live metrics here</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-slate-700 text-slate-400"
              onClick={() => fetchPlatformMetrics()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Architecture Overview Card ────────────────────

function ArchitectureCard() {
  const features = [
    { icon: Wifi, label: 'SSE Connections', desc: 'Real-time event streaming', color: 'text-emerald-400' },
    { icon: Users, label: 'Presence', desc: 'See who is online', color: 'text-cyan-400' },
    { icon: MousePointer2, label: 'Cursor Sharing', desc: 'Live cursor positions', color: 'text-violet-400' },
    { icon: MessageSquare, label: 'Chat', desc: 'In-room messaging', color: 'text-pink-400' },
    { icon: BarChart3, label: 'Live Metrics', desc: 'Real-time analytics', color: 'text-amber-400' },
    { icon: TrendingUp, label: 'Cost Tracking', desc: 'Execution cost trends', color: 'text-emerald-400' },
  ]

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <Zap className="h-5 w-5 text-cyan-400" />
          Platform Features
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="bg-slate-800/30 rounded-lg p-3">
                <Icon className={`h-4 w-4 ${f.color} mb-1.5`} />
                <div className="text-xs text-white font-medium">{f.label}</div>
                <div className="text-[10px] text-slate-500">{f.desc}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ─────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">OpenWorkflow</h1>
              <p className="text-[10px] text-slate-500">Real-time Collaboration & Live Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">
              <Circle className="h-1.5 w-1.5 mr-1 fill-cyan-400" />
              SSE Powered
            </Badge>
            <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400">
              v2.0
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">
        {/* Page Title */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">
            Real-time Collaboration <span className="text-cyan-400">&</span> Live Analytics
          </h2>
          <p className="text-sm text-slate-400">
            Two production-ready features powered by Server-Sent Events, Zustand state management, and Prisma analytics.
          </p>
        </div>

        {/* Architecture Overview */}
        <ArchitectureCard />

        {/* Main Feature Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Collaboration Panel */}
          <div className="min-h-[600px]">
            <CollaborationPanel />
          </div>

          {/* Analytics Dashboard */}
          <div className="min-h-[600px]">
            <AnalyticsDashboard />
          </div>
        </div>

        {/* Technical Details */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <ChevronRight className="h-5 w-5 text-violet-400" />
              Technical Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Collaboration Architecture */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-3">Collaboration System</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">CollaborationManager</strong> — Singleton in-memory room manager with presence tracking, cursor sharing, and event broadcasting</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">SSE Endpoint</strong> — <code className="text-cyan-400">/api/collaboration</code> establishes persistent event streams per room with 30s heartbeat</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">Event Broadcaster</strong> — <code className="text-cyan-400">/api/collaboration/events</code> POST endpoint for dispatching cursor, node, and chat events</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">Zustand Store</strong> — Client state with auto-reconnect, typed events, and 100-event rolling buffer</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">Conflict Resolution</strong> — Event-based architecture with timestamp ordering and origin filtering</span>
                  </div>
                </div>
              </div>

              {/* Analytics Architecture */}
              <div>
                <h3 className="text-sm font-semibold text-violet-400 mb-3">Analytics System</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">Analytics Engine</strong> — Queries Prisma Execution table for platform, workflow, and real-time metrics</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">Platform API</strong> — <code className="text-cyan-400">/api/analytics</code> computes success rates, costs, tokens, timeline data</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">Live SSE</strong> — <code className="text-cyan-400">/api/analytics/live</code> polls every 5s for real-time metric changes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">Per-Workflow</strong> — <code className="text-cyan-400">/api/analytics/[workflowId]</code> provides node-level breakdowns and hourly timelines</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <span><strong className="text-slate-300">Zustand Store</strong> — Manages SSE lifecycle, metric caching, and auto-refresh with Map-based workflow storage</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 px-6 py-3">
        <div className="max-w-7xl mx-auto text-center text-[10px] text-slate-600">
          OpenWorkflow — Real-time Collaboration & Live Analytics • Powered by Next.js 16, SSE, Zustand, Prisma
        </div>
      </footer>
    </div>
  )
}
