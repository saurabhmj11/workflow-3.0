'use client'

import { useState, useCallback } from 'react'
import { useExecutionStore } from '@/stores/execution-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCategoryForType, type NodeType, type NodeExecutionStep } from '@/lib/types'
import { executeWorkflow } from '@/lib/engine'
import { ExecutionErrorPanel, ErrorDetailsDialog } from '@/components/execution/execution-error-panel'
import {
  Check, X, Clock, Loader2, AlertTriangle,
  ChevronDown, ChevronRight, Zap, Brain, UserCheck,
  GitBranch, Plug, RefreshCw, Copy, Eye, Activity,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const CATEGORY_ICONS: Record<string, typeof Zap> = {
  trigger: Zap, ai: Brain, human: UserCheck, logic: GitBranch, action: Plug,
}

export function ExecutionReplay() {
  const results = useExecutionStore((s) => s.results)
  const activeResultId = useExecutionStore((s) => s.activeResultId)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const setActiveResult = useExecutionStore((s) => s.setActiveResult)
  const activeResult = results.find((r) => r.runId === activeResultId)

  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col bg-zinc-900">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            Execution Log
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 p-6 text-center">
          <Clock className="h-8 w-8 mb-2 text-zinc-700" />
          <p className="text-xs font-medium text-zinc-500">No executions yet</p>
          <p className="text-[11px] text-zinc-600 mt-1">Run your workflow to see the execution trace here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            Execution Log
          </h3>
          {isRunning && (
            <Badge className="text-[10px] gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-full px-2 py-0.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Running
            </Badge>
          )}
        </div>
      </div>

      {results.length > 1 && (
        <div className="p-2 border-b border-zinc-800 space-y-1 max-h-28 overflow-y-auto">
          {results.slice(0, 5).map((r) => (
            <button
              key={r.runId}
              onClick={() => setActiveResult(r.runId)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left text-xs transition-colors ${
                r.runId === activeResultId
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                r.status === 'success' ? 'bg-emerald-400' :
                r.status === 'error' ? 'bg-red-400' :
                r.status === 'awaiting_approval' ? 'bg-amber-400' :
                'bg-blue-400 animate-pulse'
              }`} />
              <span className="font-mono truncate">{r.runId.slice(0, 14)}…</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 bg-zinc-900">
        {activeResult && <ActiveResultView result={activeResult} isRunning={isRunning} />}
      </div>
    </div>
  )
}

function ActiveResultView({
  result,
  isRunning,
}: {
  result: ReturnType<typeof useExecutionStore.getState>['results'][0]
  isRunning: boolean
}) {
  const [retrying, setRetrying] = useState(false)
  const storeNodes = useWorkflowStore((s) => s.nodes)
  const storeEdges = useWorkflowStore((s) => s.edges)
  const errorSteps = result.steps.filter((s) => s.status === 'error')
  const hasErrors = result.status === 'error' || errorSteps.length > 0

  const handleRetry = useCallback(async () => {
    if (isRunning || retrying) return
    setRetrying(true)
    try {
      const res = await fetch(`/api/executions/${result.runId}/retry`, { method: 'POST' })
      const json = await res.json()
      const nodesSnapshot = storeNodes.map(n => ({ ...n, config: { ...n.config } }))
      const edgesSnapshot = [...storeEdges]
      if (json.ok) {
        executeWorkflow(json.data.workflowId, nodesSnapshot, edgesSnapshot, json.data.input ?? {}).catch(() => {
          useExecutionStore.getState().forceResetRunning()
        })
        toast({ title: 'Retrying', description: `New run: ${json.data.runId.slice(0, 20)}` })
      } else if (nodesSnapshot.length > 0) {
        executeWorkflow(result.workflowId, nodesSnapshot, edgesSnapshot).catch(() => {
          useExecutionStore.getState().forceResetRunning()
        })
        toast({ title: 'Retrying', description: 'Running workflow from the beginning.' })
      }
    } catch {
      const nodesSnapshot = storeNodes.map(n => ({ ...n, config: { ...n.config } }))
      if (nodesSnapshot.length > 0) executeWorkflow(result.workflowId, nodesSnapshot, [...storeEdges]).catch(() => {})
      toast({ title: 'Retrying', description: 'Running workflow from the beginning.' })
    } finally {
      setTimeout(() => setRetrying(false), 1500)
    }
  }, [result.runId, result.workflowId, isRunning, retrying, storeNodes, storeEdges])

  const handleCopyErrors = useCallback(async () => {
    if (errorSteps.length === 0) return
    const details = errorSteps.map((s, i) =>
      `[Error ${i + 1}] Node: ${s.label} (${s.nodeType})\nMessage: ${s.error || 'Unknown error'}`
    ).join('\n\n')
    try {
      await navigator.clipboard.writeText(details)
      toast({ title: 'Copied', description: `${errorSteps.length} error(s) copied to clipboard.` })
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }, [errorSteps])

  const handleRetryFromStep = useCallback((step: NodeExecutionStep) => {
    if (isRunning) return
    const nodesSnapshot = storeNodes.map(n => ({ ...n, config: { ...n.config } }))
    if (nodesSnapshot.length === 0) { toast({ title: 'Cannot retry', variant: 'destructive' }); return }
    executeWorkflow(result.workflowId, nodesSnapshot, [...storeEdges]).catch(() => {
      useExecutionStore.getState().forceResetRunning()
    })
    toast({ title: 'Retrying from node', description: `"${step.label}"` })
  }, [result.workflowId, isRunning, storeNodes, storeEdges])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <StatusBadge status={result.status} />
        {result.totalDurationMs > 0 && (
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
            {result.totalDurationMs}ms
          </span>
        )}
        <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
          {result.steps.length} steps
        </span>
      </div>

      {hasErrors && !isRunning && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            <span className="text-xs font-medium text-red-400">
              {errorSteps.length === 1 ? 'Execution error' : `${errorSteps.length} errors`}
            </span>
          </div>
          {errorSteps.length === 1 && errorSteps[0].error && (
            <p className="text-[11px] text-red-300/70 font-mono pl-5 break-all">{errorSteps[0].error}</p>
          )}
          <div className="flex items-center gap-2 pl-5">
            <Button size="sm" className="h-7 px-2.5 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 rounded gap-1.5"
              onClick={handleRetry} disabled={retrying || isRunning}>
              {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Retry
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-300 gap-1.5"
              onClick={handleCopyErrors}>
              <Copy className="h-3 w-3" /> Copy errors
            </Button>
          </div>
        </div>
      )}

      <div className="relative space-y-1">
        {result.steps.map((step, i) => (
          <TimelineStep
            key={step.nodeId}
            step={step}
            index={i}
            cat={getCategoryForType(step.nodeType)}
            isLast={i === result.steps.length - 1}
            onRetryFromStep={handleRetryFromStep}
            isRetrying={retrying || isRunning}
          />
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-0.5 hover:bg-emerald-500/10"><Check className="h-3 w-3" /> Completed</Badge>
    case 'error':
      return <Badge className="text-[10px] gap-1 bg-red-500/10 text-red-400 border border-red-500/25 rounded-full px-2 py-0.5 hover:bg-red-500/10"><X className="h-3 w-3" /> Failed</Badge>
    case 'running':
      return <Badge className="text-[10px] gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-full px-2 py-0.5 hover:bg-blue-500/10"><Loader2 className="h-3 w-3 animate-spin" /> Running</Badge>
    case 'awaiting_approval':
      return <Badge className="text-[10px] gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-full px-2 py-0.5 hover:bg-amber-500/10"><UserCheck className="h-3 w-3" /> Awaiting Approval</Badge>
    default:
      return <Badge variant="outline" className="text-[10px] rounded-full border px-2 py-0.5 text-zinc-400">{status}</Badge>
  }
}

function TimelineStep({
  step, index, cat, isLast, onRetryFromStep, isRetrying,
}: {
  step: ReturnType<typeof useExecutionStore.getState>['results'][0]['steps'][0]
  index: number
  cat: ReturnType<typeof getCategoryForType>
  isLast: boolean
  onRetryFromStep?: (step: NodeExecutionStep) => void
  isRetrying?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const Icon = CATEGORY_ICONS[cat.category] ?? Zap
  const isError = step.status === 'error'
  const duration = step.startedAt && step.finishedAt
    ? new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()
    : null

  return (
    <div className="flex gap-2.5 group">
      <div className={`relative flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 ${
        step.status === 'running' ? 'bg-blue-500/20 border border-blue-500/40' :
        step.status === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30' :
        step.status === 'error' ? 'bg-red-500/15 border border-red-500/30' :
        'bg-zinc-800 border border-zinc-700'
      }`}>
        {step.status === 'running' ? <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" /> :
         step.status === 'success' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> :
         step.status === 'error' ? <X className="h-3.5 w-3.5 text-red-400" /> :
         <Icon className="h-3.5 w-3.5 text-zinc-500" />}
        {!isLast && <div className="absolute top-7 left-1/2 -translate-x-1/2 w-px h-full bg-zinc-800" />}
      </div>

      <div className="flex-1 min-w-0 mb-3">
        <button onClick={() => setExpanded(!expanded)}
          className="w-full text-left rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 px-3 py-2 transition-colors">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium truncate ${isError ? 'text-red-400' : 'text-zinc-200'}`}>
              {step.label}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
              isError ? 'bg-red-500/10 text-red-400' : 'bg-zinc-900 text-zinc-500'
            }`}>{step.nodeType}</span>
            <span className="ml-auto text-zinc-600 shrink-0">
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          </div>
          {duration !== null && (
            <span className="text-[10px] text-zinc-600 mt-1 block">{duration}ms</span>
          )}
        </button>

        {expanded && (
          <div className="mt-1 px-3 pb-2 space-y-2 bg-zinc-800/30 rounded-b-lg border border-t-0 border-zinc-800">
            {!isError && !!step.output && (
              <div className="pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Output</p>
                <pre className="text-[11px] font-mono text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-32 break-all whitespace-pre-wrap">
                  {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                </pre>
              </div>
            )}
            {isError && (
              <ExecutionErrorPanel step={step} onRetryFromStep={onRetryFromStep} isRetrying={isRetrying} />
            )}
          </div>
        )}

        {isError && !expanded && (
          <div className="flex items-center gap-2 mt-1 px-1">
            <button onClick={(e) => { e.stopPropagation(); setErrorDialogOpen(true) }}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-blue-400 transition-colors">
              <Eye className="h-3 w-3" /> View details
            </button>
            <button onClick={async (e) => {
              e.stopPropagation()
              try { await navigator.clipboard.writeText(`Error in ${step.label}: ${step.error || 'Unknown'}`) 
                    toast({ title: 'Copied' }) } catch { toast({ title: 'Copy failed', variant: 'destructive' }) }
            }} className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        )}

        {isError && (
          <ErrorDetailsDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen} step={step} />
        )}
      </div>
    </div>
  )
}
