'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Mail, Brain, GitBranch, Search, Bot, UserCheck, Send,
  AlertTriangle, MessageSquare, Loader2, Check, SkipForward,
  ChevronRight, Clock, Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { type DemoEmail, type KBArticle, PIPELINE_STAGES, KB_ARTICLES, AI_DRAFT_RESPONSES, ESCALATION_TEMPLATE } from '@/lib/demo-data'

// ─── Icon map ─────────────────────────────────────

const ICON_MAP: Record<string, typeof Mail> = {
  Mail, Brain, GitBranch, Search, Bot, UserCheck, Send, AlertTriangle, MessageSquare,
}

// ─── Step state ───────────────────────────────────

interface StepState {
  id: string
  status: 'pending' | 'running' | 'done' | 'skipped'
  output?: string
  detail?: string
  durationMs?: number
}

// ─── Props ────────────────────────────────────────

interface PipelineVisualizerProps {
  email: DemoEmail
  onComplete: (response: string | null, escalated: boolean) => void
  onCancel: () => void
}

// ─── Component ────────────────────────────────────

export function PipelineVisualizer({ email, onComplete, onCancel }: PipelineVisualizerProps) {
  const [steps, setSteps] = useState<StepState[]>(() =>
    PIPELINE_STAGES.map((s) => ({ id: s.id, status: 'pending' as const }))
  )
  const [activePath, setActivePath] = useState<'high' | 'low' | null>(null)
  const [finalResponse, setFinalResponse] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const abortRef = useRef(false)

  const isHighConfidence = email.confidence >= 80

  const updateStep = useCallback((id: string, updates: Partial<StepState>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }, [])

  const runStep = useCallback(
    async (id: string, output: string, detail?: string, durationMs?: number) => {
      if (abortRef.current) return
      updateStep(id, { status: 'running' })
      const delay = 600 + Math.random() * 1000
      await new Promise((r) => setTimeout(r, delay))
      if (abortRef.current) return
      updateStep(id, { status: 'done', output, detail, durationMs: Math.round(delay) })
    },
    [updateStep]
  )

  const handleStart = useCallback(async () => {
    abortRef.current = false
    setIsProcessing(true)
    setActivePath(isHighConfidence ? 'high' : 'low')

    const relevantArticles = KB_ARTICLES.filter(
      (a) => a.category === email.category || a.relevance > 0.8
    ).slice(0, 3)

    // Step 1: Email received
    await runStep('email', `From: ${email.fromName}`, `Subject: ${email.subject}`, 50)

    // Step 2: Classify
    await runStep(
      'classifier',
      `${email.category} — ${email.confidence}% confidence`,
      `Analyzed email content and determined this is a ${email.category} issue with ${email.priority} priority`,
      1200
    )

    // Step 3: Confidence gate
    if (isHighConfidence) {
      await runStep(
        'condition',
        `Yes — ${email.confidence}% >= 80%`,
        'High confidence path: auto-draft response',
        30
      )

      // Skip escalation path
      updateStep('escalation', { status: 'skipped' })
      updateStep('slack', { status: 'skipped' })

      // Step 4: RAG search
      await runStep(
        'rag',
        `Found ${relevantArticles.length} relevant articles`,
        relevantArticles.map((a) => `${a.id}: ${a.title} (${Math.round(a.relevance * 100)}% match)`).join('\n'),
        800
      )

      // Step 5: Draft response
      const responseFn = AI_DRAFT_RESPONSES[email.category] || AI_DRAFT_RESPONSES.general
      const draftResponse = responseFn(email, relevantArticles)
      const truncatedDetail = draftResponse.length > 200 ? draftResponse.slice(0, 200) + '...' : draftResponse
      await runStep('llm', 'Response drafted', truncatedDetail, 2500)

      // Step 6: Approval (auto-approved for high confidence)
      if (email.confidence >= 90) {
        await runStep('approval', 'Auto-approved', 'Confidence >= 90%, quality threshold met', 50)
      } else {
        await runStep('approval', 'Approved by support lead', 'Response reviewed and approved by human agent', 3000)
      }

      // Step 7: Send
      await runStep('send', `Sent to ${email.from}`, `Subject: Re: ${email.subject}`, 200)

      setFinalResponse(draftResponse)
      onComplete(draftResponse, false)
    } else {
      // Low confidence path
      await runStep(
        'condition',
        `No — ${email.confidence}% < 80%`,
        'Low confidence: escalating to human agent',
        30
      )

      // Skip high-confidence path
      updateStep('rag', { status: 'skipped' })
      updateStep('llm', { status: 'skipped' })
      updateStep('approval', { status: 'skipped' })
      updateStep('send', { status: 'skipped' })

      // Escalation
      const escalation = ESCALATION_TEMPLATE(email)
      await runStep('escalation', 'Escalated to senior support', escalation.note, 300)

      // Slack notification
      await runStep('slack', 'Posted to #support-escalations', escalation.slack, 150)

      setFinalResponse(null)
      onComplete(null, true)
    }

    setIsProcessing(false)
  }, [email, isHighConfidence, runStep, updateStep, onComplete])

  const handleCancel = useCallback(() => {
    abortRef.current = true
    setIsProcessing(false)
    onCancel()
  }, [onCancel])

  // Determine which steps belong to which path
  const highConfPath = ['email', 'classifier', 'condition', 'rag', 'llm', 'approval', 'send']
  const lowConfPath = ['email', 'classifier', 'condition', 'escalation', 'slack']

  const getStepStatus = (stepId: string) => steps.find((s) => s.id === stepId)

  const completedCount = steps.filter((s) => s.status === 'done').length
  const totalCount = activePath === 'high' ? highConfPath.length : activePath === 'low' ? lowConfPath.length : PIPELINE_STAGES.length

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Pipeline steps */}
      <div className="space-y-1.5">
        {PIPELINE_STAGES.filter((stage) => {
          const step = getStepStatus(stage.id)
          if (!step) return false
          // Show all steps, but dim skipped ones
          return true
        }).map((stage) => {
          const step = getStepStatus(stage.id)!
          const Icon = ICON_MAP[stage.icon] || Mail
          const isSkipped = step.status === 'skipped'
          const isRunning = step.status === 'running'
          const isDone = step.status === 'done'

          // Determine path membership
          const isInHighPath = highConfPath.includes(stage.id)
          const isInLowPath = lowConfPath.includes(stage.id)
          let pathLabel = ''
          if (isInHighPath && !isInLowPath) pathLabel = 'High confidence'
          else if (isInLowPath && !isInHighPath) pathLabel = 'Low confidence'
          else pathLabel = 'Both paths'

          return (
            <div
              key={stage.id}
              className={`rounded-lg border p-2.5 transition-all duration-300 ${
                isSkipped
                  ? 'border-zinc-800 bg-zinc-900/20 opacity-30'
                  : isRunning
                  ? 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20'
                  : isDone
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-zinc-700/50 bg-zinc-800/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Status icon */}
                <div className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
                  style={{
                    backgroundColor: isRunning ? 'rgba(59,130,246,0.1)' : isDone ? 'rgba(16,185,129,0.1)' : isSkipped ? 'transparent' : 'rgba(39,39,42,0.5)',
                  }}
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                  ) : isDone ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : isSkipped ? (
                    <SkipForward className="h-3.5 w-3.5 text-zinc-600" />
                  ) : (
                    <Icon className={`h-4 w-4 ${isDone ? 'text-emerald-400' : 'text-zinc-500'}`} />
                  )}
                </div>

                {/* Label and description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${isSkipped ? 'text-zinc-600 line-through' : isRunning ? 'text-blue-300' : 'text-zinc-200'}`}>
                      {stage.label}
                    </span>
                    {pathLabel && !isSkipped && step.status === 'pending' && (
                      <span className="text-[9px] text-zinc-600 hidden lg:inline">{pathLabel}</span>
                    )}
                    {isDone && step.durationMs && (
                      <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>
                  {isRunning && (
                    <p className="text-[10px] text-blue-400/70 mt-0.5">{stage.description}...</p>
                  )}
                </div>

                {/* Output badge */}
                {step.output && !isSkipped && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] h-5 shrink-0 max-w-[180px] truncate ${
                      isDone
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-700/50 border-zinc-600 text-zinc-400'
                    }`}
                  >
                    {step.output}
                  </Badge>
                )}
              </div>

              {/* Detail expansion for done steps */}
              {isDone && step.detail && (
                <pre className="text-[10px] text-zinc-400 mt-1.5 ml-9.5 whitespace-pre-wrap font-mono leading-relaxed">
                  {step.detail}
                </pre>
              )}
            </div>
          )
        })}
      </div>

      {/* Final response preview */}
      {finalResponse && !isProcessing && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">AI-Generated Response</span>
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              {email.confidence >= 90 ? 'Auto-approved' : 'Human-approved'}
            </Badge>
          </div>
          <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto">
            {finalResponse}
          </pre>
        </div>
      )}

      {/* Escalation notice */}
      {!finalResponse && !isProcessing && activePath === 'low' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Escalated to Human Agent</span>
            <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
              Needs Review
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-400">
            This email was classified with low confidence ({email.confidence}%) and has been escalated
            to a senior support agent. The team has been notified on Slack and will respond within 30
            minutes per your SLA.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isProcessing && (
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="flex-1 h-9 rounded-lg border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 text-xs font-medium transition-colors"
          >
            Try Another Email
          </button>
        </div>
      )}

      {/* Start button (shown before processing) */}
      {steps.every((s) => s.status === 'pending') && (
        <button
          onClick={handleStart}
          className="w-full h-10 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Zap className="h-4 w-4" />
          Run AI Support Employee
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 py-1">
          <Loader2 className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
          <span className="text-[10px] text-cyan-400 font-medium">Processing email through pipeline...</span>
        </div>
      )}
    </div>
  )
}
