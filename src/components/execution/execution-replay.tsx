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
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-zinc-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">AI Employee Activity</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <Clock className="h-6 w-6 mb-2 opacity-30" />
          <p className="text-xs">No activity yet</p>
          <p className="text-[10px] opacity-60">Run a workflow or try the AI Employee Demo</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">AI Employee Activity</h3>
          {isRunning && (
            <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-500/10 text-blue-400 border-blue-500/30">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Working
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
                r.runId === activeResultId ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-zinc-800/50 text-zinc-400'
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
    <div className="space-y-0">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <StatusBadge status={result.status} />
        {result.totalDurationMs > 0 && (
          <span className="text-[10px] text-zinc-500 font-mono">{result.totalDurationMs}ms</span>
        )}
        {result.totalCostUsd && (
          <span className="text-[10px] text-zinc-500 font-mono">${result.totalCostUsd}</span>
        )}
        <span className="text-[10px] text-zinc-600 font-mono">{result.steps.length} steps</span>
      </div>

      {/* Error recovery actions — shown when execution has errors */}
      {hasErrors && !isRunning && (
        <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/5 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[11px] font-medium text-red-400">
              {errorSteps.length === 1 ? 'Execution failed' : `${errorSteps.length} steps failed`}
            </span>
          </div>

          {/* Prominent error message for single error */}
          {errorSteps.length === 1 && errorSteps[0].error && (
            <p className="text-[10px] text-red-400/80 font-mono break-words pl-5">
              {errorSteps[0].error}
            </p>
          )}

          <div className="flex items-center gap-2 pl-5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[11px] border-red-500/30 text-red-400 hover:text-red-200 hover:bg-red-500/10 hover:border-red-500/50"
              onClick={handleRetry}
              disabled={retrying || isRunning}
            >
              {retrying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Retry Workflow
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[11px] border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              onClick={handleCopyErrors}
            >
              <Copy className="h-3 w-3" />
              Copy Error
            </Button>
          </div>
        </div>
      )}

      {/* Timeline steps */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />

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
      return <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"><Check className="h-2.5 w-2.5" /> Complete</Badge>
    case 'error':
      return <Badge className="text-[10px] gap-1 bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/10"><X className="h-2.5 w-2.5" /> Error</Badge>
    case 'running':
      return <Badge className="text-[10px] gap-1 bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Working</Badge>
    case 'awaiting_approval':
      return <Badge className="text-[10px] gap-1 bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"><UserCheck className="h-2.5 w-2.5" /> Needs Approval</Badge>
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>
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
  const dotColor = step.status === 'running' ? 'bg-blue-500 ring-2 ring-blue-500/30 animate-pulse' :
    step.status === 'success' ? 'bg-emerald-500' :
    step.status === 'error' ? 'bg-red-500' :
    'bg-zinc-600'

  const Icon = CATEGORY_ICONS[cat.category] ?? Zap

  // Duration
  const duration = step.startedAt && step.finishedAt
    ? new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()
    : null

  const isError = step.status === 'error'

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
      <div className="flex-1 min-w-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left hover:bg-zinc-800/30 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium truncate ${isError ? 'text-red-300' : 'text-zinc-200'}`}>{step.label}</span>
            <span className={`text-[9px] ${isError ? 'text-red-400' : cat.color} font-mono shrink-0`}>{step.nodeType}</span>
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

        {/* Expanded output / error panel */}
        {expanded && (
          <div className="mt-1.5 ml-1 space-y-1.5">
            {/* Success output */}
            {!isError && step.output && (
              <div>
                <p className="text-[10px] text-zinc-500 mb-1">Output:</p>
                <pre className="text-[10px] font-mono text-emerald-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32 border border-zinc-800">
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
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400">{step.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Quick action buttons for error steps (always visible, not just expanded) */}
        {isError && !expanded && (
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); setErrorDialogOpen(true) }}
              className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors px-1 py-0.5 rounded hover:bg-zinc-800/50"
            >
              <Eye className="h-2.5 w-2.5" />
              View Details
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
              className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors px-1 py-0.5 rounded hover:bg-zinc-800/50"
            >
              <Copy className="h-2.5 w-2.5" />
              Copy Error
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
