'use client'

import { useState, useCallback } from 'react'
import {
  Headphones, ArrowLeft, ExternalLink, Bot, Sparkles, Zap, Shield,
  Clock, Users, ChevronRight, Workflow, Share2, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmailInbox } from '@/components/support-employee/email-inbox'
import { PipelineVisualizer } from '@/components/support-employee/pipeline-visualizer'
import { KnowledgeBase } from '@/components/support-employee/knowledge-base'
import { MetricsDashboard } from '@/components/support-employee/metrics-dashboard'
import { type DemoEmail, DEMO_EMAILS } from '@/lib/demo-data'
import { useRouter } from 'next/navigation'

// ─── Feature cards ────────────────────────────────

const FEATURES = [
  { icon: Bot, label: 'AI-Powered', desc: 'Classifies, searches, and drafts responses automatically' },
  { icon: Shield, label: 'Human-in-the-Loop', desc: 'Quality gate ensures every response meets your standards' },
  { icon: Clock, label: '78% Faster', desc: 'Average response time drops from 10 min to 2.3 min' },
  { icon: Users, label: 'Scales Infinitely', desc: 'Handle 10x ticket volume without hiring' },
]

// ─── Page Component ───────────────────────────────

export default function DemoPage() {
  const router = useRouter()
  const [selectedEmail, setSelectedEmail] = useState<DemoEmail | null>(null)
  const [pipelineActive, setPipelineActive] = useState(false)
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [lastResponse, setLastResponse] = useState<string | null>(null)
  const [lastEscalated, setLastEscalated] = useState(false)
  const [highlightedCategory, setHighlightedCategory] = useState<string | undefined>()
  const [searchedArticles, setSearchedArticles] = useState<string[]>([])
  const [shareCopied, setShareCopied] = useState(false)

  const handleEmailSelect = useCallback((email: DemoEmail) => {
    setSelectedEmail(email)
    setPipelineActive(true)
    setHighlightedCategory(email.category)
  }, [])

  const handlePipelineComplete = useCallback(
    (response: string | null, escalated: boolean) => {
      if (selectedEmail) {
        setProcessedIds((prev) => new Set([...prev, selectedEmail.id]))
      }
      setLastResponse(response)
      setLastEscalated(escalated)
    },
    [selectedEmail]
  )

  const handlePipelineCancel = useCallback(() => {
    setPipelineActive(false)
    setSelectedEmail(null)
    setHighlightedCategory(undefined)
    setSearchedArticles([])
  }, [])

  const handleLoadToCanvas = useCallback(() => {
    // Store a flag in sessionStorage so the main page knows to load the template
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('openworkflow-load-template', 'ai-support-employee')
    }
    router.push('/build')
  }, [router])

  const handleShare = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      })
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* Top navigation */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs">Home</span>
          </button>
          <div className="w-px h-5 bg-zinc-700" />
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Headphones className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100">
                AI Support Employee <span className="text-cyan-400">Live Demo</span>
              </h1>
              <p className="text-[10px] text-zinc-500">Watch your AI employee handle real support emails</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] bg-emerald-500/5 border-emerald-500/20 text-emerald-400 gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 text-xs"
            onClick={handleShare}
          >
            {shareCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                Share Demo
              </>
            )}
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-linear-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-xs"
            onClick={handleLoadToCanvas}
          >
            <Workflow className="h-3.5 w-3.5" />
            Open in Builder
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Email Inbox */}
        <div className="w-80 border-r border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0">
          <EmailInbox
            selectedId={selectedEmail?.id ?? null}
            onSelect={handleEmailSelect}
            processedIds={processedIds}
          />
        </div>

        {/* Center: Pipeline Visualizer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {!pipelineActive && !selectedEmail ? (
              /* ─── Welcome / Hero State ─── */
              <div className="flex items-center justify-center h-full">
                <div className="max-w-lg text-center space-y-6">
                  <div className="h-20 w-20 rounded-lg bg-linear-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/10">
                    <Headphones className="h-10 w-10 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                      Your AI Support Employee
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
                      Select an email from the inbox to watch your AI employee process it in
                      real-time — classifying the issue, searching your knowledge base, drafting
                      a response, and routing complex cases to humans.
                    </p>
                  </div>

                  {/* Feature cards */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {FEATURES.map((f) => {
                      const Icon = f.icon
                      return (
                        <div
                          key={f.label}
                          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-left"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-[11px] font-semibold text-zinc-200">{f.label}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500">{f.desc}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Quick start */}
                  <div className="pt-2">
                    <Button
                      size="sm"
                      className="h-10 gap-2 bg-linear-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white shadow-lg shadow-cyan-500/20"
                      onClick={() => handleEmailSelect(DEMO_EMAILS[0])}
                    >
                      <Sparkles className="h-4 w-4" />
                      Start with first email
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedEmail ? (
              /* ─── Pipeline Execution ─── */
              <div className="max-w-2xl mx-auto">
                {/* Email context card */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedEmail.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                      'bg-zinc-700/50 text-zinc-400'
                    }`}>
                      {selectedEmail.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">{selectedEmail.fromName}</p>
                      <p className="text-[10px] text-zinc-500">{selectedEmail.from}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] ${
                      selectedEmail.priority === 'urgent' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                      selectedEmail.priority === 'high' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                      'bg-zinc-700/50 border-zinc-600 text-zinc-400'
                    }`}>
                      {selectedEmail.priority}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200 mb-1">{selectedEmail.subject}</h3>
                  <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed line-clamp-4">
                    {selectedEmail.body}
                  </pre>
                </div>

                {/* Pipeline */}
                <PipelineVisualizer
                  email={selectedEmail}
                  onComplete={handlePipelineComplete}
                  onCancel={handlePipelineCancel}
                />
              </div>
            ) : null}
          </div>

          {/* Bottom: Metrics strip */}
          <div className="border-t border-zinc-800 bg-zinc-900/80 px-6 py-3 shrink-0">
            <MetricsDashboard />
          </div>
        </div>

        {/* Right: Knowledge Base */}
        <div className="w-72 border-l border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0">
          <KnowledgeBase
            highlightedCategory={highlightedCategory}
            searchedArticles={searchedArticles}
          />
        </div>
      </div>
    </div>
  )
}
