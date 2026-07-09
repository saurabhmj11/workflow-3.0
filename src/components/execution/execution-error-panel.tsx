'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { getCategoryForType } from '@/lib/types'
import type { NodeExecutionStep, NodeType } from '@/lib/types'
import {
  AlertTriangle,
  Copy,
  RefreshCw,
  FileText,
  Code2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Loader2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ─── Error category classification ────────────────
// Categorizes errors based on their message content

type ErrorCategory = 'timeout' | 'api_error' | 'validation_error' | 'unknown'

function classifyError(error: string): ErrorCategory {
  const lower = error.toLowerCase()
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('deadline')) return 'timeout'
  if (lower.includes('api') || lower.includes('rate limit') || lower.includes('429') || lower.includes('503') || lower.includes('500') || lower.includes('connection')) return 'api_error'
  if (lower.includes('validation') || lower.includes('invalid') || lower.includes('required') || lower.includes('schema') || lower.includes('parse')) return 'validation_error'
  return 'unknown'
}

const ERROR_CATEGORY_META: Record<ErrorCategory, { label: string; color: string; bgColor: string; borderColor: string }> = {
  timeout: { label: 'Too Slow!', color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' },
  api_error: { label: 'Connection Lost', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' },
  validation_error: { label: 'Oopsie!', color: 'text-pink-600', bgColor: 'bg-pink-100', borderColor: 'border-pink-200' },
  unknown: { label: 'Unknown Error', color: 'text-slate-500', bgColor: 'bg-slate-100', borderColor: 'border-slate-200' },
}

// ─── Execution Error Panel Props ──────────────────

interface ExecutionErrorPanelProps {
  step: NodeExecutionStep
  /** Whether this step's node config is available */
  nodeConfig?: Record<string, unknown>
  /** Callback to retry from this specific step */
  onRetryFromStep?: (step: NodeExecutionStep) => void
  /** Whether a retry is in progress */
  isRetrying?: boolean
}

// ─── Execution Error Panel ────────────────────────

export function ExecutionErrorPanel({
  step,
  nodeConfig,
  onRetryFromStep,
  isRetrying = false,
}: ExecutionErrorPanelProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [showConfig, setShowConfig] = useState(false)

  const errorMessage = step.error || 'Unknown error occurred'
  const category = classifyError(errorMessage)
  const categoryMeta = ERROR_CATEGORY_META[category]
  const cat = getCategoryForType(step.nodeType)

  // Extract stack trace if available in output
  const output = step.output as Record<string, unknown> | undefined
  const stackTrace = (output?.stack as string) || (output?.stackTrace as string) || null

  const handleCopyError = async () => {
    const details = [
      `Error in node: ${step.label} (${step.nodeType})`,
      `Node ID: ${step.nodeId}`,
      `Category: ${categoryMeta.label}`,
      `Message: ${errorMessage}`,
      stackTrace ? `\nStack Trace:\n${stackTrace}` : '',
      step.input ? `\nInput:\n${JSON.stringify(step.input, null, 2)}` : '',
      nodeConfig ? `\nConfig:\n${JSON.stringify(nodeConfig, null, 2)}` : '',
    ].join('\n')

    try {
      await navigator.clipboard.writeText(details)
      toast({ title: 'Copied', description: 'Error details copied to clipboard' })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard', variant: 'destructive' })
    }
  }

  const handleRetryFromStep = () => {
    if (onRetryFromStep && !isRetrying) {
      onRetryFromStep(step)
    }
  }

  return (
    <div className="space-y-3">
      {/* Error header with red border */}
      <div className="rounded-lg border border-red-100 bg-red-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="bg-red-200 p-1.5 rounded-full mt-0.5">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-red-500 uppercase tracking-wider">Error</span>
              <Badge className={`text-[10px] font-bold uppercase gap-1 ${categoryMeta.bgColor} ${categoryMeta.color} ${categoryMeta.borderColor} border-2 hover:${categoryMeta.bgColor} rounded-xl px-2 py-0.5`}>
                {categoryMeta.label}
              </Badge>
              <span className={`text-[10px] font-bold bg-white px-2 py-0.5 rounded-lg border-2 border-slate-100 text-slate-500`}>{step.nodeType}</span>
            </div>
            <p className="text-xs font-bold text-red-600 mt-2 font-mono wrap-break-word bg-white p-2 rounded-xl border-2 border-red-100 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Stack trace (if available) */}
      {stackTrace && (
        <div className="bg-white rounded-xl border-2 border-slate-100 p-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors w-full px-2 py-1"
          >
            {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Nerd Details
          </button>
          {showDetails && (
            <pre className="mt-2 text-[10px] font-mono font-medium text-slate-600 bg-slate-50 rounded-xl p-3 overflow-x-auto max-h-32 border-2 border-slate-100">
              {stackTrace}
            </pre>
          )}
        </div>
      )}

      {/* Node type and config */}
      <div className="space-y-3 bg-white rounded-lg border border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
          <Cpu className="h-4 w-4 text-slate-300" />
          <span>Block: <span className="text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border-2 border-slate-100">{step.label}</span></span>
          <span className="text-slate-300">·</span>
          <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border-2 border-slate-100">{step.nodeType}</span>
        </div>

        {/* Duration */}
        {step.startedAt && step.finishedAt && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Clock className="h-4 w-4 text-slate-300" />
            <span>Stopped after <span className="text-slate-600">{new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()}ms</span></span>
          </div>
        )}

        {/* Config that caused the error */}
        {nodeConfig && Object.keys(nodeConfig).length > 0 && (
          <div className="bg-slate-50 rounded-xl border-2 border-slate-100 p-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors w-full px-2 py-1"
            >
              {showConfig ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Block Settings
            </button>
            {showConfig && (
              <pre className="mt-2 text-[10px] font-mono font-medium text-slate-600 bg-white rounded-lg p-3 overflow-x-auto max-h-32 border-2 border-slate-100">
                {JSON.stringify(nodeConfig, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Input that was passed to the node */}
        {step.input !== undefined && step.input !== null && (
          <div className="bg-slate-50 rounded-xl border-2 border-slate-100 p-2">
            <button
              onClick={() => setShowInput(!showInput)}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors w-full px-2 py-1"
            >
              {showInput ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              What went in
            </button>
            {showInput && (
              <pre className="mt-2 text-[10px] font-mono font-medium text-slate-600 bg-white rounded-lg p-3 overflow-x-auto max-h-32 border-2 border-slate-100">
                {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {onRetryFromStep && (
          <Button
            size="sm"
            className="h-10 px-4 gap-2 text-sm font-bold rounded-lg border-b border-orange-300 bg-orange-400 text-white hover:bg-orange-300 hover:border-orange-200 active:border-b-0 active:scale-[0.98] transition-all"
            onClick={handleRetryFromStep}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry from here
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-10 px-4 gap-2 text-sm font-bold rounded-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
          onClick={handleCopyError}
        >
          <Copy className="h-4 w-4" />
          Copy Details
        </Button>
      </div>
    </div>
  )
}

// ─── Error Details Dialog ─────────────────────────
// Shows full error output in a dialog when clicking "View Details"

interface ErrorDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  step: NodeExecutionStep | null
  nodeConfig?: Record<string, unknown>
}

export function ErrorDetailsDialog({
  open,
  onOpenChange,
  step,
  nodeConfig,
}: ErrorDetailsDialogProps) {
  if (!step) return null

  const errorMessage = step.error || 'Unknown error occurred'
  const category = classifyError(errorMessage)
  const categoryMeta = ERROR_CATEGORY_META[category]
  const cat = getCategoryForType(step.nodeType)
  const output = step.output as Record<string, unknown> | undefined
  const stackTrace = (output?.stack as string) || (output?.stackTrace as string) || null

  const handleCopyError = async () => {
    const details = [
      `Error in node: ${step.label} (${step.nodeType})`,
      `Node ID: ${step.nodeId}`,
      `Category: ${categoryMeta.label}`,
      `Message: ${errorMessage}`,
      stackTrace ? `\nStack Trace:\n${stackTrace}` : '',
      step.input ? `\nInput:\n${JSON.stringify(step.input, null, 2)}` : '',
      nodeConfig ? `\nConfig:\n${JSON.stringify(nodeConfig, null, 2)}` : '',
      step.output ? `\nOutput:\n${JSON.stringify(step.output, null, 2)}` : '',
    ].join('\n')

    try {
      await navigator.clipboard.writeText(details)
      toast({ title: 'Copied', description: 'Error details copied to clipboard' })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-slate-100 text-slate-700 max-w-lg rounded-[2rem] p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500 text-xl font-extrabold">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="h-6 w-6" />
            </div>
            Uh Oh! Let's Fix This!
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm font-medium mt-2">
            Something went wrong with the "{step.label}" block. Don't worry, we can figure it out!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Error summary */}
          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`text-[10px] font-bold uppercase gap-1 ${categoryMeta.bgColor} ${categoryMeta.color} ${categoryMeta.borderColor} border-2 hover:${categoryMeta.bgColor} rounded-xl px-2 py-0.5`}>
                {categoryMeta.label}
              </Badge>
              <span className={`text-[10px] font-bold bg-white px-2 py-0.5 rounded-lg border-2 border-slate-100 text-slate-500`}>{step.nodeType}</span>
            </div>
            <p className="text-xs font-bold text-red-600 font-mono wrap-break-word bg-white p-3 rounded-xl border-2 border-red-100 leading-relaxed">
              {errorMessage}
            </p>
          </div>

          {/* Stack trace */}
          {stackTrace && (
            <div className="bg-slate-50 p-3 rounded-lg border-2 border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-slate-300" /> Nerd Details
              </p>
              <pre className="text-[10px] font-mono font-medium text-slate-600 bg-white rounded-xl p-3 overflow-x-auto max-h-40 border-2 border-slate-100">
                {stackTrace}
              </pre>
            </div>
          )}

          {/* Node config */}
          {nodeConfig && Object.keys(nodeConfig).length > 0 && (
            <div className="bg-slate-50 p-3 rounded-lg border-2 border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-slate-300" /> Block Settings
              </p>
              <pre className="text-[10px] font-mono font-medium text-slate-600 bg-white rounded-xl p-3 overflow-x-auto max-h-32 border-2 border-slate-100">
                {JSON.stringify(nodeConfig, null, 2)}
              </pre>
            </div>
          )}

          {/* Input data */}
          {step.input !== undefined && step.input !== null && (
            <div className="bg-slate-50 p-3 rounded-lg border-2 border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-300" /> What Went In
              </p>
              <pre className="text-[10px] font-mono font-medium text-slate-600 bg-white rounded-xl p-3 overflow-x-auto max-h-32 border-2 border-slate-100">
                {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output data */}
          {step.output !== undefined && step.output !== null && (
            <div className="bg-slate-50 p-3 rounded-lg border-2 border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-300" /> What Came Out
              </p>
              <pre className="text-[10px] font-mono font-medium text-slate-600 bg-white rounded-xl p-3 overflow-x-auto max-h-32 border-2 border-slate-100">
                {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-slate-100">
          <Button
            size="sm"
            variant="outline"
            className="h-10 px-4 gap-2 text-sm font-bold rounded-lg border-2 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
            onClick={handleCopyError}
          >
            <Copy className="h-4 w-4" />
            Copy All Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { classifyError, ERROR_CATEGORY_META, type ErrorCategory }
