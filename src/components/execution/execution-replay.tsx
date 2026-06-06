'use client'

import { useExecutionStore } from '@/stores/execution-store'
import { Badge } from '@/components/ui/badge'
import { getCategoryForType, NODE_CATEGORIES, type NodeType, type NodeExecutionStatus } from '@/lib/types'
import { Check, X, Clock, Loader2, AlertTriangle, ChevronDown, ChevronRight, Zap, Brain, UserCheck, GitBranch, Plug } from 'lucide-react'
import { useState } from 'react'

// Category icons for the timeline
const CATEGORY_ICONS: Record<string, typeof Zap> = {
  trigger: Zap,
  ai: Brain,
  human: UserCheck,
  logic: GitBranch,
  action: Plug,
}

export function ExecutionReplay() {
  const results = useExecutionStore((s) => s.results)
  const activeResultId = useExecutionStore((s) => s.activeResultId)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const setActiveResult = useExecutionStore((s) => s.setActiveResult)

  const activeResult = results.find((r) => r.runId === activeResultId)

  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Execution Replay</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <Clock className="h-6 w-6 mb-2 opacity-30" />
          <p className="text-xs">No executions yet</p>
          <p className="text-[10px] opacity-60">Click Run to watch the AI work</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Execution Replay</h3>
          {isRunning && (
            <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-500/10 text-blue-400 border-blue-500/30">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Running
            </Badge>
          )}
        </div>
      </div>

      {/* Run selector */}
      {results.length > 1 && (
        <div className="p-2 border-b border-zinc-800 space-y-1 max-h-24 overflow-y-auto">
          {results.slice(0, 5).map((r) => (
            <button
              key={r.runId}
              onClick={() => setActiveResult(r.runId)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs ${
                r.runId === activeResultId ? 'bg-blue-500/10 text-blue-400' : 'hover:bg-zinc-800/50 text-zinc-400'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${
                r.status === 'success' ? 'bg-emerald-500' :
                r.status === 'error' ? 'bg-red-500' :
                r.status === 'awaiting_approval' ? 'bg-amber-500' :
                'bg-blue-500 animate-pulse'
              }`} />
              <span className="font-mono truncate">{r.runId.slice(0, 20)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active result — Timeline view */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeResult && (
          <div className="space-y-0">
            {/* Summary bar */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <StatusBadge status={activeResult.status} />
              {activeResult.totalDurationMs > 0 && (
                <span className="text-[10px] text-zinc-500 font-mono">{activeResult.totalDurationMs}ms</span>
              )}
              {activeResult.totalCostUsd && (
                <span className="text-[10px] text-zinc-500 font-mono">${activeResult.totalCostUsd}</span>
              )}
              <span className="text-[10px] text-zinc-600 font-mono">{activeResult.steps.length} steps</span>
            </div>

            {/* Timeline steps */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />

              {activeResult.steps.map((step, i) => {
                const cat = getCategoryForType(step.nodeType)
                const isLast = i === activeResult.steps.length - 1
                const Icon = CATEGORY_ICONS[cat.category] ?? Zap

                return <TimelineStep key={step.nodeId} step={step} index={i} cat={cat} Icon={Icon} isLast={isLast} />
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"><Check className="h-2.5 w-2.5" /> Complete</Badge>
    case 'error':
      return <Badge className="text-[10px] gap-1 bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/10"><X className="h-2.5 w-2.5" /> Error</Badge>
    case 'running':
      return <Badge className="text-[10px] gap-1 bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Running</Badge>
    case 'awaiting_approval':
      return <Badge className="text-[10px] gap-1 bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"><UserCheck className="h-2.5 w-2.5" /> Awaiting Approval</Badge>
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>
  }
}

function TimelineStep({
  step,
  index,
  cat,
  Icon,
  isLast,
}: {
  step: ReturnType<typeof useExecutionStore.getState>['results'][0]['steps'][0]
  index: number
  cat: ReturnType<typeof getCategoryForType>
  Icon: typeof Zap
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  // Status dot color
  const dotColor = step.status === 'running' ? 'bg-blue-500 ring-2 ring-blue-500/30 animate-pulse' :
    step.status === 'success' ? 'bg-emerald-500' :
    step.status === 'error' ? 'bg-red-500' :
    'bg-zinc-600'

  // Duration
  const duration = step.startedAt && step.finishedAt
    ? new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()
    : null

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Timeline dot */}
      <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full ${dotColor} shrink-0 mt-0.5`}>
        {step.status === 'running' ? (
          <Loader2 className="h-3 w-3 text-white animate-spin" />
        ) : step.status === 'success' ? (
          <Check className="h-3 w-3 text-white" />
        ) : step.status === 'error' ? (
          <X className="h-3 w-3 text-white" />
        ) : (
          <Icon className="h-3 w-3 text-white" />
        )}
      </div>

      {/* Step content */}
      <div className={`flex-1 min-w-0 ${isLast ? '' : ''}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left hover:bg-zinc-800/30 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-200 truncate">{step.label}</span>
            <span className={`text-[9px] ${cat.color} font-mono shrink-0`}>{step.nodeType}</span>
            {expanded ? <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0 ml-auto" /> : <ChevronRight className="h-3 w-3 text-zinc-500 shrink-0 ml-auto" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {duration !== null && (
              <span className="text-[10px] text-zinc-500 font-mono">{duration}ms</span>
            )}
            {step.tokenUsage && (
              <span className="text-[10px] text-zinc-600 font-mono">{step.tokenUsage.prompt}+{step.tokenUsage.completion} tokens</span>
            )}
            {step.costUsd && (
              <span className="text-[10px] text-zinc-600 font-mono">${step.costUsd}</span>
            )}
          </div>
        </button>

        {/* Expanded output */}
        {expanded && (
          <div className="mt-1.5 ml-1 space-y-1.5">
            {step.output && (
              <div>
                <p className="text-[10px] text-zinc-500 mb-1">Output:</p>
                <pre className="text-[10px] font-mono text-emerald-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32 border border-zinc-800">
                  {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                </pre>
              </div>
            )}
            {step.error && (
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-400">{step.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
