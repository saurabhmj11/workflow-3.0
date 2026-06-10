'use client'

import { useState } from 'react'
import { Mail, Clock, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Star, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { type DemoEmail, DEMO_EMAILS } from '@/lib/demo-data'

// ─── Props ────────────────────────────────────────

interface EmailInboxProps {
  selectedId: string | null
  onSelect: (email: DemoEmail) => void
  processedIds?: Set<string>
}

// ─── Priority colors ──────────────────────────────

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  urgent: { bg: 'bg-red-500/5', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
  high: { bg: 'bg-orange-500/5', border: 'border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-400' },
  normal: { bg: 'bg-zinc-800/30', border: 'border-zinc-700', text: 'text-zinc-400', dot: 'bg-zinc-400' },
  low: { bg: 'bg-zinc-800/30', border: 'border-zinc-700', text: 'text-zinc-500', dot: 'bg-zinc-500' },
}

// ─── Component ────────────────────────────────────

export function EmailInbox({ selectedId, onSelect, processedIds = new Set() }: EmailInboxProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const unreadCount = DEMO_EMAILS.filter((e) => !processedIds.has(e.id)).length

  return (
    <div className="flex flex-col h-full">
      {/* Inbox header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-zinc-200">Support Inbox</span>
          {unreadCount > 0 && (
            <Badge className="text-[9px] h-4 bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Clock className="h-3 w-3" />
          <span>Updated just now</span>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {DEMO_EMAILS.map((email) => {
          const isSelected = selectedId === email.id
          const isProcessed = processedIds.has(email.id)
          const isExpanded = expandedId === email.id
          const priorityStyle = PRIORITY_STYLES[email.priority] || PRIORITY_STYLES.normal

          return (
            <div key={email.id}>
              <button
                onClick={() => {
                  onSelect(email)
                  setExpandedId(isExpanded ? null : email.id)
                }}
                className={`w-full text-left transition-all border-b border-zinc-800/50 ${
                  isSelected
                    ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500'
                    : 'hover:bg-zinc-800/30 border-l-2 border-l-transparent'
                }`}
              >
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      email.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                      email.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-zinc-700/50 text-zinc-400'
                    }`}>
                      {email.avatar}
                    </div>

                    {/* Name and time */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium truncate ${isProcessed ? 'text-zinc-500' : 'text-zinc-200'}`}>
                          {email.fromName}
                        </span>
                        <span className="text-[9px] text-zinc-600 ml-auto shrink-0">{email.timestamp}</span>
                      </div>
                      <p className={`text-[11px] truncate ${isProcessed ? 'text-zinc-600' : 'text-zinc-300'}`}>
                        {email.subject}
                      </p>
                    </div>

                    {/* Status indicators */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isProcessed && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {!isProcessed && email.priority === 'urgent' && (
                        <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3 text-zinc-500" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-zinc-500" />
                      )}
                    </div>
                  </div>

                  {/* Priority + category badges */}
                  <div className="flex items-center gap-1.5 ml-9">
                    <Badge variant="outline" className={`text-[9px] h-4 ${priorityStyle.bg} ${priorityStyle.border} ${priorityStyle.text}`}>
                      {email.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] h-4 bg-violet-500/5 border-violet-500/20 text-violet-400">
                      {email.category}
                    </Badge>
                    {email.confidence >= 80 && (
                      <Badge variant="outline" className="text-[9px] h-4 bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
                        <Zap className="h-2.5 w-2.5 mr-0.5" />
                        Auto-resolve
                      </Badge>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded preview */}
              {isExpanded && (
                <div className="px-4 py-3 bg-zinc-900/50 border-b border-zinc-800/50">
                  <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                    {email.body}
                  </pre>
                  {email.confidence < 80 && (
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-400">
                      <AlertCircle className="h-3 w-3" />
                      <span>Low confidence — will be escalated to human agent</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Inbox footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <span className="text-[10px] text-zinc-500">{DEMO_EMAILS.length} emails</span>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-zinc-600" />
          <span className="text-[10px] text-zinc-600">AI-monitored</span>
        </div>
      </div>
    </div>
  )
}
