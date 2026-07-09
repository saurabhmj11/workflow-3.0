'use client'

import { useState, useCallback } from 'react'
import { memoryStore } from '@/lib/memory/store'
import type { CustomerContext, MemoryNoteSummary } from '@/lib/memory/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Brain,
  Search,
  User,
  Building2,
  Crown,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Tag,
  Loader2,
  Mail,
  Phone,
  Sparkles,
  Heart,
  Shield,
  Lightbulb,
  AlertTriangle,
  Star,
  Eye,
  ExternalLink,
} from 'lucide-react'

// ─── Note category config ───────────────────────
const noteCategoryConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  preference: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  fact: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  insight: { icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  warning: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  commitment: { icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
}

export function MemoryPanel() {
  const [email, setEmail] = useState('')
  const [context, setContext] = useState<CustomerContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!email.trim()) return
    setLoading(true)
    try {
      const realContext = await memoryStore.getCustomerContext(email.trim())
      if (realContext) {
        setContext(realContext)
      } else {
        setContext(memoryStore.getSimulatedContext(email.trim()))
      }
    } catch {
      setContext(memoryStore.getSimulatedContext(email.trim()))
    } finally {
      setLoading(false)
    }
  }, [email])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }, [handleSearch])

  const handleExtract = useCallback(async () => {
    if (!context) return
    setExtracting(true)
    try {
      // Try to find customer ID from context
      const customerId = (context as any).id || email
      const result = await memoryStore.extractKnowledge(customerId)
      if (result && result.notes.length > 0) {
        // Refresh context
        const updated = await memoryStore.getCustomerContext(email)
        if (updated) setContext(updated)
        else setContext({ ...context, memoryNotes: result.notes })
      }
    } catch (err) {
      console.warn('Failed to extract knowledge:', err)
    } finally {
      setExtracting(false)
    }
  }, [context, email])

  const sentimentIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-3 w-3 text-emerald-400" />
    if (trend === 'declining') return <TrendingDown className="h-3 w-3 text-red-400" />
    return <Minus className="h-3 w-3 text-zinc-400" />
  }

  const tierColors: Record<string, string> = {
    enterprise: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    pro: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    starter: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    free: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  }

  const sentimentColors: Record<string, string> = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-zinc-400',
    mixed: 'text-amber-400',
  }

  const statusColors: Record<string, string> = {
    resolved: 'border-emerald-500/30 text-emerald-400',
    escalated: 'border-amber-500/30 text-amber-400',
    in_progress: 'border-blue-500/30 text-blue-400',
    new: 'border-zinc-500/30 text-zinc-400',
    closed: 'border-zinc-600/30 text-zinc-500',
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-1.5 mb-2">
          <Brain className="h-3.5 w-3.5 text-violet-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400">Agent Memory</h3>
          <a
            href="/memory"
            target="_blank"
            className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Open Memory Dashboard"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex gap-1.5">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="customer@email.com"
            className="h-7 text-xs bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-zinc-600"
          />
          <Button
            size="icon"
            className="h-7 w-7 shrink-0 bg-violet-600 hover:bg-violet-500 text-white"
            onClick={handleSearch}
            disabled={loading || !email.trim()}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
          </Button>
        </div>
        <p className="text-[9px] text-zinc-600 mt-1">Look up customer history & context</p>
      </div>

      <ScrollArea className="flex-1">
        {context ? (
          <div className="p-2 space-y-3">
            {/* Customer Header */}
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                    <span className="text-sm font-medium text-zinc-100 truncate">{context.name || context.email}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{context.email}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] ${tierColors[context.tier] ?? tierColors.free}`}>
                  <Crown className="h-2.5 w-2.5 mr-0.5" />
                  {context.tier}
                </Badge>
              </div>
              {context.company && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Building2 className="h-3 w-3 text-zinc-500" />
                  <span className="text-xs text-zinc-400">{context.company}</span>
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2 text-center">
                <p className="text-sm font-bold text-zinc-200">{context.totalInteractions}</p>
                <p className="text-[9px] text-zinc-500">Total</p>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2 text-center">
                <p className="text-sm font-bold text-amber-400">{context.openTickets}</p>
                <p className="text-[9px] text-zinc-500">Open</p>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2 text-center">
                <div className="flex items-center justify-center gap-0.5">
                  {sentimentIcon(context.sentimentTrend)}
                  <span className="text-sm font-bold text-zinc-200">{context.avgSentimentScore.toFixed(1)}</span>
                </div>
                <p className="text-[9px] text-zinc-500">Sentiment</p>
              </div>
            </div>

            {/* Memory Notes (AI-extracted knowledge) */}
            {context.memoryNotes && context.memoryNotes.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-pink-400" />
                    <span className="text-[10px] text-pink-400 uppercase tracking-wider font-medium">Knowledge Notes</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-zinc-600 hover:text-violet-400"
                    onClick={handleExtract}
                    disabled={extracting}
                    title="Extract more knowledge"
                  >
                    {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  </Button>
                </div>
                {context.memoryNotes.slice(0, 6).map((note) => {
                  const config = noteCategoryConfig[note.category]
                  const Icon = config?.icon || Tag
                  return (
                    <div key={note.id} className={`flex items-start gap-1.5 p-1.5 rounded-md border ${config?.border || 'border-zinc-700'} ${config?.bg || 'bg-zinc-900/50'}`}>
                      <Icon className={`h-2.5 w-2.5 mt-0.5 shrink-0 ${config?.color || 'text-zinc-400'}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-200 leading-tight">{note.content}</p>
                        <p className="text-[8px] text-zinc-600 mt-0.5">
                          {note.category} · {(note.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Extract Knowledge Button (when no notes) */}
            {(!context.memoryNotes || context.memoryNotes.length === 0) && (
              <Button
                size="sm"
                className="w-full h-7 gap-1.5 text-[10px] bg-violet-600 hover:bg-violet-500 text-white"
                onClick={handleExtract}
                disabled={extracting}
              >
                {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Extract Knowledge from Interactions
              </Button>
            )}

            {/* Tags */}
            {context.tags.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {context.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[9px] border-zinc-700 text-zinc-400">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {context.metadata && Object.keys(context.metadata).length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Account Details</span>
                <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2 space-y-1">
                  {Object.entries(context.metadata).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-[10px] text-zinc-300 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Interactions */}
            {context.recentInteractions.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Recent Interactions</span>
                </div>
                {context.recentInteractions.map((interaction) => (
                  <div key={interaction.id} className="rounded-md border border-zinc-800 bg-zinc-900/50 p-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-zinc-200 font-medium truncate">{interaction.subject || `${interaction.type} interaction`}</p>
                        {interaction.summary && (
                          <p className="text-[9px] text-zinc-500 mt-0.5 line-clamp-2">{interaction.summary}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-[8px] shrink-0 ${statusColors[interaction.status] ?? ''}`}>
                        {interaction.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-0.5">
                        {interaction.type === 'email' ? <Mail className="h-2.5 w-2.5 text-zinc-600" /> :
                         interaction.type === 'call' ? <Phone className="h-2.5 w-2.5 text-zinc-600" /> :
                         <MessageSquare className="h-2.5 w-2.5 text-zinc-600" />}
                        <span className="text-[9px] text-zinc-600">{interaction.type}</span>
                      </div>
                      {interaction.sentiment && (
                        <span className={`text-[9px] ${sentimentColors[interaction.sentiment] ?? 'text-zinc-500'}`}>
                          {interaction.sentiment}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 ml-auto">
                        <Clock className="h-2.5 w-2.5 text-zinc-600" />
                        <span className="text-[9px] text-zinc-600">{new Date(interaction.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600 px-4">
            <Brain className="h-8 w-8 mb-3 opacity-20" />
            <p className="text-xs text-center">Agent Memory</p>
            <p className="text-[10px] text-center opacity-60 mt-1">
              Search a customer email to see their history, sentiment, and context.
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
