'use client'

import { useExecutionStore } from '@/stores/execution-store'
import { Badge } from '@/components/ui/badge'
import { getCategoryForType, NODE_CATEGORIES } from '@/lib/types'
import { Check, X, Clock, Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export function ExecutionPanel() {
  const results = useExecutionStore((s) => s.results)
  const activeResultId = useExecutionStore((s) => s.activeResultId)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const setActiveResult = useExecutionStore((s) => s.setActiveResult)

  const activeResult = results.find((r) => r.runId === activeResultId)

  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border/30">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Execution Log</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Clock className="h-6 w-6 mb-2 opacity-30" />
          <p className="text-xs">No executions yet</p>
          <p className="text-[10px] opacity-60">Click Run to execute the workflow</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Execution Log</h3>
          {isRunning && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Running
            </Badge>
          )}
        </div>
      </div>

      {/* Run selector */}
      {results.length > 1 && (
        <div className="p-2 border-b border-border/30 space-y-1">
          {results.map((r) => (
            <button
              key={r.runId}
              onClick={() => setActiveResult(r.runId)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs ${
                r.runId === activeResultId ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${
                r.status === 'success' ? 'bg-emerald-500' :
                r.status === 'error' ? 'bg-red-500' :
                r.status === 'awaiting_approval' ? 'bg-amber-500' :
                'bg-primary animate-pulse'
              }`} />
              <span className="font-mono truncate">{r.runId.slice(0, 20)}</span>
              <Badge variant="outline" className="text-[9px] ml-auto px-1 py-0">{r.status}</Badge>
            </button>
          ))}
        </div>
      )}

      {/* Active result detail */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeResult && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Run Summary</span>
                <Badge variant={activeResult.status === 'success' ? 'default' : 'secondary'} className="text-[10px]">
                  {activeResult.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Duration</p>
                  <p className="text-sm font-mono">{activeResult.totalDurationMs > 0 ? `${activeResult.totalDurationMs}ms` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Cost</p>
                  <p className="text-sm font-mono">{activeResult.totalCostUsd ? `$${activeResult.totalCostUsd}` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Nodes</p>
                  <p className="text-sm font-mono">{activeResult.steps.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Started</p>
                  <p className="text-sm font-mono">{new Date(activeResult.startedAt).toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1">
              {activeResult.steps.map((step, i) => {
                let cat
                try {
                  cat = getCategoryForType(step.nodeType)
                } catch {
                  cat = NODE_CATEGORIES[0] // fallback to trigger category
                }
                return <StepCard key={step.nodeId} step={step} index={i} cat={cat} />
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepCard({ step, index, cat }: { step: ReturnType<typeof useExecutionStore.getState>['results'][0]['steps'][0]; index: number; cat: ReturnType<typeof getCategoryForType> }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-md border border-border/30 overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        {step.status === 'running' ? (
          <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
        ) : step.status === 'success' ? (
          <Check className="h-3 w-3 text-emerald-500 shrink-0" />
        ) : step.status === 'error' ? (
          <X className="h-3 w-3 text-red-500 shrink-0" />
        ) : (
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
        )}
        <span className="text-xs font-mono text-muted-foreground">{index + 1}.</span>
        <span className="text-xs font-medium flex-1 truncate">{step.label}</span>
        <span className={`text-[9px] ${cat.color} font-mono`}>{step.nodeType}</span>
        {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 pt-1 border-t border-border/20 space-y-2">
          {step.tokenUsage && (
            <div className="flex gap-3">
              <span className="text-[10px] text-muted-foreground">Tokens: {step.tokenUsage.prompt}+{step.tokenUsage.completion}</span>
              {step.costUsd && <span className="text-[10px] text-muted-foreground">Cost: ${step.costUsd}</span>}
            </div>
          )}
          {step.output && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Output:</p>
              <pre className="text-[10px] font-mono text-emerald-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32">
                {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}
          {step.error && (
            <p className="text-[10px] text-red-400">{step.error}</p>
          )}
          {step.startedAt && step.finishedAt && (
            <p className="text-[10px] text-muted-foreground/60">
              {new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()}ms
            </p>
          )}
        </div>
      )}
    </div>
  )
}
