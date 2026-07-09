'use client'

import { useState, useCallback } from 'react'
import { useExecutionStore } from '@/stores/execution-store'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCategoryForType, NODE_CATEGORIES, type NodeType, type NodeExecutionStatus, type NodeExecutionStep } from '@/lib/types'
import { executeWorkflow } from '@/lib/engine'
import { ExecutionErrorPanel, ErrorDetailsDialog } from '@/components/execution/execution-error-panel'
import { Check, X, Clock, Loader2, AlertTriangle, ChevronDown, ChevronRight, Zap, Brain, UserCheck, GitBranch, Plug, RefreshCw, Copy, Eye } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

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
      <div className="h-full flex flex-col bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Robot's Diary
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center bg-white">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4 border border-slate-100">
            <Clock className="h-10 w-10 text-slate-300" />
          </div>
          <p className="text-base font-bold text-slate-500 mb-2">Nothing happened yet!</p>
          <p className="text-xs font-medium text-slate-400 max-w-[200px]">Press play on your workflow to watch the robot work its magic!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Robot's Diary
          </h3>
          {isRunning && (
            <Badge variant="secondary" className="text-xs font-bold gap-1.5 bg-blue-100 text-blue-600 border-2 border-blue-200 rounded-xl px-3 py-1 shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working...
            </Badge>
          )}
        </div>
      </div>

      {/* Run selector */}
      {results.length > 1 && (
        <div className="p-3 border-b border-slate-100 bg-slate-50/30 space-y-2 max-h-32 overflow-y-auto">
          {results.slice(0, 5).map((r) => (
            <button
              key={r.runId}
              onClick={() => setActiveResult(r.runId)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-bold transition-all border-2 ${
                r.runId === activeResultId ? 'bg-white border-blue-200 text-blue-700 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100 hover:border-slate-200 text-slate-500'
              }`}
            >
              <span className={`h-3.5 w-3.5 rounded-full ${
                r.status === 'success' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
                r.status === 'error' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
                r.status === 'awaiting_approval' ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' :
                'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.5)]'
              }`} />
              <span className="font-mono truncate">{r.runId.slice(0, 10)}...</span>
            </button>
          ))}
        </div>
      )}

      {/* Active result — Timeline view */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {activeResult && (
          <ActiveResultView result={activeResult} isRunning={isRunning} />
        )}
      </div>
    </div>
  )
}

// ─── Active Result View ───────────────────────────
// Contains the summary bar, retry/copy buttons, and timeline

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

  // Find error steps
  const errorSteps = result.steps.filter((s) => s.status === 'error')
  const hasErrors = result.status === 'error' || errorSteps.length > 0

  // ─── Retry the entire workflow ──────────────────
  const handleRetry = useCallback(async () => {
    if (isRunning || retrying) return
    setRetrying(true)

    try {
      // First try server-side retry (if execution is persisted)
      const res = await fetch(`/api/executions/${result.runId}/retry`, { method: 'POST' })
      const json = await res.json()

      if (json.ok) {
        // Server retry succeeded — now re-execute client-side with current nodes/edges
        const nodesSnapshot = storeNodes.map(n => ({ ...n, config: { ...n.config } }))
        const edgesSnapshot = [...storeEdges]

        executeWorkflow(json.data.workflowId, nodesSnapshot, edgesSnapshot, json.data.input ?? {}).catch((err) => {
          console.error('[OpenWorkflow] Retry execution failed:', err)
          useExecutionStore.getState().forceResetRunning()
          toast({ title: 'Retry failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
        })

        toast({ title: 'Retrying execution', description: `New run: ${json.data.runId.slice(0, 20)}` })
      } else {
        // Fallback to client-side retry with current workflow state
        const nodesSnapshot = storeNodes.map(n => ({ ...n, config: { ...n.config } }))
        const edgesSnapshot = [...storeEdges]

        if (nodesSnapshot.length === 0) {
          toast({ title: 'Cannot retry', description: 'No workflow nodes available for retry', variant: 'destructive' })
          return
        }

        executeWorkflow(result.workflowId, nodesSnapshot, edgesSnapshot).catch((err) => {
          console.error('[OpenWorkflow] Retry execution failed:', err)
          useExecutionStore.getState().forceResetRunning()
          toast({ title: 'Retry failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
        })

        toast({ title: 'Retrying execution', description: 'Running workflow from the beginning' })
      }
    } catch (err) {
      // API call failed — still try client-side retry
      const nodesSnapshot = storeNodes.map(n => ({ ...n, config: { ...n.config } }))
      const edgesSnapshot = [...storeEdges]

      if (nodesSnapshot.length > 0) {
        executeWorkflow(result.workflowId, nodesSnapshot, edgesSnapshot).catch(() => {
          useExecutionStore.getState().forceResetRunning()
        })
      }
      toast({ title: 'Retrying...', description: 'Running workflow from the beginning' })
    } finally {
      // Reset after a short delay so the user sees the loading state
      setTimeout(() => setRetrying(false), 1500)
    }
  }, [result.runId, result.workflowId, isRunning, retrying, storeNodes, storeEdges])

  // ─── Retry from a specific step ─────────────────
  const handleRetryFromStep = useCallback((step: NodeExecutionStep) => {
    if (isRunning) return

    // For step-level retry, we re-run the entire workflow but mark the step
    // as pending in the UI so it gets re-executed
    const nodesSnapshot = storeNodes.map(n => ({ ...n, config: { ...n.config } }))
    const edgesSnapshot = [...storeEdges]

    if (nodesSnapshot.length === 0) {
      toast({ title: 'Cannot retry', description: 'No workflow nodes available', variant: 'destructive' })
      return
    }

    executeWorkflow(result.workflowId, nodesSnapshot, edgesSnapshot).catch((err) => {
      console.error('[OpenWorkflow] Step retry failed:', err)
      useExecutionStore.getState().forceResetRunning()
      toast({ title: 'Retry failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    })

    toast({ title: 'Retrying from step', description: `Re-running from "${step.label}"` })
  }, [result.workflowId, isRunning, storeNodes, storeEdges])

  // ─── Copy all error details ─────────────────────
  const handleCopyErrors = useCallback(async () => {
    if (errorSteps.length === 0) return

    const details = errorSteps.map((step, i) => {
      const lines = [
        `[Error ${i + 1}] Node: ${step.label} (${step.nodeType})`,
        `Node ID: ${step.nodeId}`,
        `Message: ${step.error || 'Unknown error'}`,
      ]
      if (step.input) {
        lines.push(`Input: ${typeof step.input === 'string' ? step.input : JSON.stringify(step.input)}`)
      }
      if (step.output) {
        lines.push(`Output: ${typeof step.output === 'string' ? step.output : JSON.stringify(step.output)}`)
      }
      return lines.join('\n')
    }).join('\n\n')

    try {
      await navigator.clipboard.writeText(details)
      toast({ title: 'Copied', description: `${errorSteps.length} error(s) copied to clipboard` })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard', variant: 'destructive' })
    }
  }, [errorSteps])

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatusBadge status={result.status} />
        {result.totalDurationMs > 0 && (
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border-2 border-slate-200 px-2.5 py-1 rounded-xl">⏱️ {result.totalDurationMs}ms</span>
        )}
        {result.totalCostUsd && (
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border-2 border-slate-200 px-2.5 py-1 rounded-xl">💰 ${result.totalCostUsd}</span>
        )}
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border-2 border-slate-200 px-2.5 py-1 rounded-xl">📋 {result.steps.length} steps</span>
      </div>

      {/* Error recovery actions — shown when execution has errors */}
      {hasErrors && !isRunning && (
        <div className="mb-6 rounded-[1.5rem] border border-red-100 bg-red-50 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-red-200 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm font-bold text-red-600">
              {errorSteps.length === 1 ? 'Oops! Something went wrong.' : `Oops! ${errorSteps.length} things went wrong.`}
            </span>
          </div>

          {/* Prominent error message for single error */}
          {errorSteps.length === 1 && errorSteps[0].error && (
            <p className="text-xs text-red-500 font-mono wrap-break-word pl-[3.25rem] font-medium leading-relaxed">
              {errorSteps[0].error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pl-[3.25rem] pt-1">
            <Button
              size="sm"
              className="h-10 px-4 gap-2 text-sm font-bold rounded-lg border-b border-red-700 bg-red-500 text-white hover:bg-red-400 hover:border-red-600 active:border-b-0 active:scale-[0.98] transition-all"
              onClick={handleRetry}
              disabled={retrying || isRunning}
            >
              {retrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Try Again!
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 px-4 gap-2 text-sm font-bold rounded-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
              onClick={handleCopyErrors}
            >
              <Copy className="h-4 w-4" />
              Copy Error
            </Button>
          </div>
        </div>
      )}

      {/* Timeline steps */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[18px] top-4 bottom-4 w-1.5 bg-slate-100 rounded-full" />

        {result.steps.map((step, i) => {
          const cat = getCategoryForType(step.nodeType)
          const isLast = i === result.steps.length - 1

          return (
            <TimelineStep
              key={step.nodeId}
              step={step}
              index={i}
              cat={cat}
              isLast={isLast}
              onRetryFromStep={handleRetryFromStep}
              isRetrying={retrying || isRunning}
            />
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <Badge className="text-xs font-bold gap-1.5 bg-green-100 text-green-700 border-2 border-green-200 rounded-xl px-3 py-1 hover:bg-green-100"><Check className="h-3.5 w-3.5" /> All Done!</Badge>
    case 'error':
      return <Badge className="text-xs font-bold gap-1.5 bg-red-100 text-red-700 border-2 border-red-200 rounded-xl px-3 py-1 hover:bg-red-100"><X className="h-3.5 w-3.5" /> Uh Oh!</Badge>
    case 'running':
      return <Badge className="text-xs font-bold gap-1.5 bg-blue-100 text-blue-700 border-2 border-blue-200 rounded-xl px-3 py-1 hover:bg-blue-100"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working...</Badge>
    case 'awaiting_approval':
      return <Badge className="text-xs font-bold gap-1.5 bg-orange-100 text-orange-700 border-2 border-orange-200 rounded-xl px-3 py-1 hover:bg-orange-100"><UserCheck className="h-3.5 w-3.5" /> Needs You!</Badge>
    default:
      return <Badge variant="outline" className="text-xs font-bold rounded-xl border-2 px-3 py-1 bg-white">{status}</Badge>
  }
}

// ─── Timeline Step ────────────────────────────────
// Enhanced with error panel, view details, and copy for error steps

function TimelineStep({
  step,
  index,
  cat,
  isLast,
  onRetryFromStep,
  isRetrying,
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

  // Status dot color
  const dotColor = step.status === 'running' ? 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.6)]' :
    step.status === 'success' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
    step.status === 'error' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
    'bg-slate-300'

  const Icon = CATEGORY_ICONS[cat.category] ?? Zap

  // Duration
  const duration = step.startedAt && step.finishedAt
    ? new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()
    : null

  const isError = step.status === 'error'

  return (
    <div className="relative flex gap-4 pb-6 group">
      {/* Timeline dot */}
      <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full ${dotColor} shrink-0 border border-white`}>
        {step.status === 'running' ? (
          <Loader2 className="h-4 w-4 text-white animate-spin" />
        ) : step.status === 'success' ? (
          <Check className="h-4 w-4 text-white font-bold" />
        ) : step.status === 'error' ? (
          <X className="h-4 w-4 text-white font-bold" />
        ) : (
          <Icon className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0 bg-white rounded-lg border border-slate-100 p-2 hover:border-blue-200 transition-colors shadow-sm">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left rounded-xl px-2 py-1.5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold truncate ${isError ? 'text-red-600' : 'text-slate-700'}`}>{step.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isError ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'} shrink-0`}>{step.nodeType}</span>
            {expanded ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-auto" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 ml-auto" />}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {duration !== null && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">⏱️ {duration}ms</span>
            )}
            {step.tokenUsage && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">🪙 {step.tokenUsage.prompt}+{step.tokenUsage.completion} tokens</span>
            )}
            {step.costUsd && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">💰 ${step.costUsd}</span>
            )}
          </div>
        </button>

        {/* Expanded output / error panel */}
        {expanded && (
          <div className="mt-3 px-2 pb-2 space-y-3">
            {/* Success output */}
            {!isError && !!step.output && (
              <div className="bg-white rounded-lg border-2 border-slate-100 p-3 shadow-inner">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">What happened:</p>
                <pre className="text-xs font-mono font-medium text-slate-600 bg-slate-50 rounded-xl p-3 overflow-x-auto max-h-40">
                  {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                </pre>
              </div>
            )}

            {/* Error panel — detailed error information with actions */}
            {isError && (
              <ExecutionErrorPanel
                step={step}
                onRetryFromStep={onRetryFromStep}
                isRetrying={isRetrying}
              />
            )}

            {/* Non-error inline error display */}
            {!isError && step.error && (
              <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border-2 border-amber-100 mt-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs font-bold text-amber-600">{step.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Quick action buttons for error steps (always visible, not just expanded) */}
        {isError && !expanded && (
          <div className="flex items-center gap-2 mt-2 px-2 pb-1 border-t-2 border-slate-100 pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); setErrorDialogOpen(true) }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-xl hover:bg-blue-50 border-2 border-transparent hover:border-blue-100"
            >
              <Eye className="h-3.5 w-3.5" />
              Look Closer
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const details = `Error in ${step.label} (${step.nodeType}): ${step.error || 'Unknown'}`
                  await navigator.clipboard.writeText(details)
                  toast({ title: 'Copied', description: 'Error message copied' })
                } catch {
                  toast({ title: 'Copy failed', variant: 'destructive' })
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-xl hover:bg-slate-100 border-2 border-transparent hover:border-slate-200"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Oopsie
            </button>
          </div>
        )}

        {/* Error details dialog */}
        {isError && (
          <ErrorDetailsDialog
            open={errorDialogOpen}
            onOpenChange={setErrorDialogOpen}
            step={step}
          />
        )}
      </div>
    </div>
  )
}
