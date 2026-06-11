'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain,
  Search,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  Phone,
  MessageSquare,
  Star,
  AlertTriangle,
  Lightbulb,
  Heart,
  Shield,
  Loader2,
  Sparkles,
  Plus,
  X,
  Clock,
  Tag,
  Building2,
  Crown,
  Eye,
  BarChart3,
  PieChart,
  Zap,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts'

// ─── Types ───────────────────────────────────────

interface CustomerSummary {
  id: string
  email: string
  name: string | null
  company: string | null
  tier: string
  totalInteractions: number
  openTickets: number
  avgSentimentScore: number
  sentimentTrend: string
  memoryNotesCount: number
  recentNotes: Array<{
    id: string
    category: string
    content: string
    confidence: number
    createdAt: string
  }>
  lastInteractionAt: string | null
  createdAt: string
}

interface MemoryAnalytics {
  overview: {
    totalCustomers: number
    totalInteractions: number
    totalSentimentLogs: number
    totalMemoryNotes: number
    openTickets: number
    avgSentimentScore: number
  }
  distributions: {
    customersByTier: Record<string, number>
    interactionsByType: Record<string, number>
    interactionsByStatus: Record<string, number>
    sentimentDistribution: Record<string, number>
    notesByCategory: Record<string, number>
  }
  recentActivity: {
    last7Days: {
      newCustomers: number
      interactions: number
      memoryNotes: number
    }
  }
  topCustomers: Array<{
    id: string
    email: string
    name: string | null
    company: string | null
    tier: string
    interactionCount: number
  }>
  trends: {
    sentiment: Array<{ date: string; avgScore: number; count: number; positive: number; negative: number; neutral: number }>
    interactions: Array<{ date: string; count: number; byType: Record<string, number> }>
  }
}

interface MemoryNote {
  id: string
  customerId: string
  customerEmail?: string
  customerName?: string
  category: string
  content: string
  source: string
  confidence: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

// ─── Color Maps ──────────────────────────────────

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  enterprise: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/30' },
  pro: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  starter: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  free: { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500/30' },
}

const noteCategoryConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  preference: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  fact: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  insight: { icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  warning: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  commitment: { icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
}

const sentimentIcon = (trend: string) => {
  if (trend === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
  if (trend === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />
  return <Minus className="h-3.5 w-3.5 text-zinc-400" />
}

const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#6366f1']

// ─── Main Page ───────────────────────────────────

export default function MemoryPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [analytics, setAnalytics] = useState<MemoryAnalytics | null>(null)
  const [notes, setNotes] = useState<MemoryNote[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)

  // Fetch analytics
  useEffect(() => {
    fetchAnalytics()
  }, [])

  // Fetch customers when search tab is active
  useEffect(() => {
    if (activeTab === 'customers' || activeTab === 'notes') {
      fetchCustomers()
    }
    if (activeTab === 'notes') {
      fetchNotes()
    }
  }, [activeTab, searchQuery])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/memory/analytics')
      const json = await res.json()
      if (json.ok) setAnalytics(json.data)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      const res = await fetch(`/api/memory/search?${params}`)
      const json = await res.json()
      if (json.ok) setCustomers(json.data.results)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }, [searchQuery])

  const fetchNotes = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCustomerId) params.set('customerId', selectedCustomerId)
      const res = await fetch(`/api/memory/notes?${params}`)
      const json = await res.json()
      if (json.ok) setNotes(json.data)
    } catch (err) {
      console.error('Failed to fetch notes:', err)
    }
  }, [selectedCustomerId])

  const handleExtractKnowledge = async (customerId: string) => {
    setExtracting(true)
    try {
      const res = await fetch('/api/memory/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      })
      const json = await res.json()
      if (json.ok) {
        // Refresh data
        await fetchCustomers()
        await fetchNotes()
        await fetchAnalytics()
      }
    } catch (err) {
      console.error('Failed to extract knowledge:', err)
    } finally {
      setExtracting(false)
    }
  }

  // ─── Overview Tab ──────────────────────────────
  const OverviewTab = () => {
    if (!analytics) return <div className="text-zinc-500 text-sm p-8 text-center">Loading analytics...</div>

    const { overview, distributions, recentActivity, trends } = analytics

    return (
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-violet-400" />
                <span className="text-xs text-zinc-500">Customers</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{overview.totalCustomers}</p>
              {recentActivity.last7Days.newCustomers > 0 && (
                <p className="text-[10px] text-emerald-400 mt-1">+{recentActivity.last7Days.newCustomers} this week</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-zinc-500">Interactions</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{overview.totalInteractions}</p>
              {recentActivity.last7Days.interactions > 0 && (
                <p className="text-[10px] text-cyan-400 mt-1">{recentActivity.last7Days.interactions} this week</p>
              )}
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-zinc-500">Open Tickets</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{overview.openTickets}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-pink-400" />
                <span className="text-xs text-zinc-500">Memory Notes</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{overview.totalMemoryNotes}</p>
              {recentActivity.last7Days.memoryNotes > 0 && (
                <p className="text-[10px] text-pink-400 mt-1">+{recentActivity.last7Days.memoryNotes} this week</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sentiment Trend */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-zinc-300">
                <Activity className="h-4 w-4 text-violet-400" />
                Sentiment Trend (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trends.sentiment.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends.sentiment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis domain={[-1, 1]} tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 6, fontSize: 11 }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Line type="monotone" dataKey="avgScore" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Avg Score" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">No sentiment data yet</div>
              )}
            </CardContent>
          </Card>

          {/* Interactions Over Time */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-zinc-300">
                <BarChart3 className="h-4 w-4 text-cyan-400" />
                Interaction Volume (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trends.interactions.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trends.interactions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 6, fontSize: 11 }}
                      labelStyle={{ color: '#a1a1aa' }}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Interactions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">No interaction data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Distribution + Top Customers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Tier Distribution */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-zinc-300">
                <PieChart className="h-4 w-4 text-emerald-400" />
                Customer Tiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(distributions.customersByTier).length > 0 ? (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={140}>
                    <RechartsPie>
                      <Pie
                        data={Object.entries(distributions.customersByTier).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {Object.entries(distributions.customersByTier).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 6, fontSize: 11 }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(distributions.customersByTier).map(([tier, count], i) => (
                      <div key={tier} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-[10px] text-zinc-400 capitalize">{tier}: {count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-zinc-600 text-sm">No customers yet</div>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-zinc-300">
                <Star className="h-4 w-4 text-amber-400" />
                Most Active Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topCustomers.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topCustomers.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-800/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedCustomerId(c.id)
                        setActiveTab('customers')
                      }}
                    >
                      <span className="text-xs font-bold text-zinc-600 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{c.name || c.email}</p>
                        <p className="text-[10px] text-zinc-500">{c.company || c.email}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] ${tierColors[c.tier]?.text || ''} ${tierColors[c.tier]?.border || ''}`}>
                        {c.tier}
                      </Badge>
                      <span className="text-xs text-zinc-400">{c.interactionCount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-zinc-600 text-sm">No customers yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Memory Notes by Category */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-zinc-300">
              <Brain className="h-4 w-4 text-pink-400" />
              Memory Notes by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(distributions.notesByCategory).length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {Object.entries(distributions.notesByCategory).map(([category, count]) => {
                  const config = noteCategoryConfig[category]
                  if (!config) return null
                  const Icon = config.icon
                  return (
                    <div key={category} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.border} ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <div>
                        <p className="text-sm font-medium text-zinc-200 capitalize">{category}</p>
                        <p className="text-[10px] text-zinc-500">{count} notes</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-zinc-600 text-sm">No memory notes yet. Extract knowledge from customer interactions to create notes.</p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Customers Tab ─────────────────────────────
  const CustomersTab = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, email, or company..."
            className="pl-9 h-9 bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Customer List */}
      {customers.length > 0 ? (
        <ScrollArea className="h-[calc(100vh-260px)]">
          <div className="space-y-2">
            {customers.map(customer => (
              <Card
                key={customer.id}
                className={`bg-zinc-900/80 border-zinc-800 cursor-pointer transition-all hover:border-zinc-600 ${
                  selectedCustomerId === customer.id ? 'ring-1 ring-violet-500/50 border-violet-500/30' : ''
                }`}
                onClick={() => setSelectedCustomerId(selectedCustomerId === customer.id ? null : customer.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shrink-0">
                      <Brain className="h-4 w-4 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100 truncate">{customer.name || customer.email}</span>
                        <Badge variant="outline" className={`text-[9px] ${tierColors[customer.tier]?.text || ''} ${tierColors[customer.tier]?.border || ''}`}>
                          <Crown className="h-2.5 w-2.5 mr-0.5" />
                          {customer.tier}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 font-mono">{customer.email}</p>
                      {customer.company && (
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3 text-zinc-600" />
                          <span className="text-xs text-zinc-400">{customer.company}</span>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-zinc-600" />
                          <span className="text-xs text-zinc-400">{customer.totalInteractions}</span>
                        </div>
                        {customer.openTickets > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-amber-400">{customer.openTickets} open</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {sentimentIcon(customer.sentimentTrend)}
                          <span className="text-xs text-zinc-400">{customer.avgSentimentScore.toFixed(1)}</span>
                        </div>
                        {customer.memoryNotesCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Brain className="h-3 w-3 text-pink-500" />
                            <span className="text-xs text-pink-400">{customer.memoryNotesCount} notes</span>
                          </div>
                        )}
                      </div>

                      {/* Recent Notes (expanded view) */}
                      {selectedCustomerId === customer.id && customer.recentNotes.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Memory Notes</p>
                          {customer.recentNotes.map(note => {
                            const config = noteCategoryConfig[note.category]
                            const Icon = config?.icon || Tag
                            return (
                              <div key={note.id} className={`flex items-start gap-2 p-2 rounded-md border ${config?.border || 'border-zinc-700'} ${config?.bg || 'bg-zinc-900/50'}`}>
                                <Icon className={`h-3 w-3 mt-0.5 ${config?.color || 'text-zinc-400'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-zinc-200">{note.content}</p>
                                  <p className="text-[9px] text-zinc-600 mt-0.5">
                                    {note.category} · confidence: {(note.confidence * 100).toFixed(0)}%
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                          <Button
                            size="sm"
                            className="mt-2 h-7 gap-1.5 text-[10px] bg-violet-600 hover:bg-violet-500 text-white"
                            onClick={(e) => { e.stopPropagation(); handleExtractKnowledge(customer.id) }}
                            disabled={extracting}
                          >
                            {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Extract Knowledge
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <Users className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">No customers found</p>
          <p className="text-xs mt-1">Search for customers or add them through workflow executions</p>
        </div>
      )}
    </div>
  )

  // ─── Notes Tab ─────────────────────────────────
  const NotesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-zinc-300 font-medium">All Memory Notes</h3>
        <div className="flex gap-2">
          {Object.entries(noteCategoryConfig).map(([category, config]) => {
            const Icon = config.icon
            return (
              <Badge
                key={category}
                variant="outline"
                className={`text-[9px] cursor-pointer ${config.border} ${config.color} hover:${config.bg}`}
              >
                <Icon className="h-2.5 w-2.5 mr-0.5" />
                {category}
              </Badge>
            )
          })}
        </div>
      </div>

      {notes.length > 0 ? (
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="space-y-2">
            {notes.map(note => {
              const config = noteCategoryConfig[note.category]
              const Icon = config?.icon || Tag
              return (
                <Card key={note.id} className="bg-zinc-900/80 border-zinc-800">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-md border ${config?.border || 'border-zinc-700'} ${config?.bg || 'bg-zinc-900'} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-3.5 w-3.5 ${config?.color || 'text-zinc-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-100">{note.content}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <Badge variant="outline" className={`text-[8px] ${config?.border} ${config?.color}`}>
                            {note.category}
                          </Badge>
                          <span className="text-[9px] text-zinc-600">
                            confidence: {(note.confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-[9px] text-zinc-600">
                            source: {note.source}
                          </span>
                          {note.customerEmail && (
                            <span className="text-[9px] text-zinc-500 font-mono">{note.customerEmail}</span>
                          )}
                          <span className="text-[9px] text-zinc-600">
                            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {note.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {note.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-[8px] border-zinc-700 text-zinc-500">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-600 hover:text-red-400 shrink-0"
                        onClick={async () => {
                          await fetch(`/api/memory/notes?id=${note.id}`, { method: 'DELETE' })
                          fetchNotes()
                          fetchAnalytics()
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
          <Brain className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-sm">No memory notes yet</p>
          <p className="text-xs mt-1">Extract knowledge from customer interactions to populate notes</p>
        </div>
      )}
    </div>
  )

  // ─── Render ────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="customers" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              <Brain className="h-3.5 w-3.5 mr-1.5" />
              Knowledge Notes
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="overview">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                </div>
              ) : (
                <OverviewTab />
              )}
            </TabsContent>
            <TabsContent value="customers">
              <CustomersTab />
            </TabsContent>
            <TabsContent value="notes">
              <NotesTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
  )
}
