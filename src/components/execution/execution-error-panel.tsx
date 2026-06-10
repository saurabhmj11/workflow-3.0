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
  timeout: { label: 'Timeout', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  api_error: { label: 'API Error', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  validation_error: { label: 'Validation', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  unknown: { label: 'Unknown', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10', borderColor: 'border-zinc-500/30' },
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
      <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-red-300">Error</span>
              <Badge className={`text-[9px] gap-1 ${categoryMeta.bgColor} ${categoryMeta.color} ${categoryMeta.borderColor} border hover:${categoryMeta.bgColor}`}>
                {categoryMeta.label}
              </Badge>
              <span className={`text-[9px] ${cat.color} font-mono`}>{step.nodeType}</span>
            </div>
            <p className="text-[11px] text-red-400 mt-1 font-mono break-words">
              {errorMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Stack trace (if available) */}
      {stackTrace && (
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showDetails ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Stack Trace
          </button>
          {showDetails && (
            <pre className="mt-1 text-[9px] font-mono text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32 border border-zinc-800">
              {stackTrace}
            </pre>
          )}
        </div>
      )}

      {/* Node type and config */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <Cpu className="h-3 w-3" />
          <span>Node: <span className="text-zinc-300">{step.label}</span></span>
          <span className="text-zinc-700">·</span>
          <span className={cat.color}>{step.nodeType}</span>
          <span className="text-zinc-700">·</span>
          <span className="text-zinc-300 font-mono">{step.nodeId}</span>
        </div>

        {/* Duration */}
        {step.startedAt && step.finishedAt && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <Clock className="h-3 w-3" />
            <span>Failed after {new Date(step.finishedAt).getTime() - new Date(step.startedAt).getTime()}ms</span>
          </div>
        )}

        {/* Config that caused the error */}
        {nodeConfig && Object.keys(nodeConfig).length > 0 && (
          <div>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showConfig ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Node Config
            </button>
            {showConfig && (
              <pre className="mt-1 text-[9px] font-mono text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32 border border-zinc-800">
                {JSON.stringify(nodeConfig, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Input that was passed to the node */}
        {step.input !== undefined && step.input !== null && (
          <div>
            <button
              onClick={() => setShowInput(!showInput)}
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showInput ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Input Data
            </button>
            {showInput && (
              <pre className="mt-1 text-[9px] font-mono text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32 border border-zinc-800">
                {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        {onRetryFromStep && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-[11px] border-amber-500/30 text-amber-400 hover:text-amber-200 hover:bg-amber-500/10 hover:border-amber-500/50"
            onClick={handleRetryFromStep}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Retry from this step
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-[11px] border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          onClick={handleCopyError}
        >
          <Copy className="h-3 w-3" />
          Copy Error Details
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
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            Error Details
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-xs">
            Full error information for failed node &quot;{step.label}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error summary */}
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`text-[9px] gap-1 ${categoryMeta.bgColor} ${categoryMeta.color} ${categoryMeta.borderColor} border hover:${categoryMeta.bgColor}`}>
                {categoryMeta.label}
              </Badge>
              <span className={`text-[9px] ${cat.color} font-mono`}>{step.nodeType}</span>
              <span className="text-[9px] text-zinc-600 font-mono">{step.nodeId}</span>
            </div>
            <p className="text-[11px] text-red-400 font-mono break-words">
              {errorMessage}
            </p>
          </div>

          {/* Stack trace */}
          {stackTrace && (
            <div>
              <p className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1">
                <Code2 className="h-3 w-3" /> Stack Trace
              </p>
              <pre className="text-[9px] font-mono text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-40 border border-zinc-800">
                {stackTrace}
              </pre>
            </div>
          )}

          {/* Node config */}
          {nodeConfig && Object.keys(nodeConfig).length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Node Config
              </p>
              <pre className="text-[9px] font-mono text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32 border border-zinc-800">
                {JSON.stringify(nodeConfig, null, 2)}
              </pre>
            </div>
          )}

          {/* Input data */}
          {step.input !== undefined && step.input !== null && (
            <div>
              <p className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Input Data
              </p>
              <pre className="text-[9px] font-mono text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32 border border-zinc-800">
                {typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output data */}
          {step.output !== undefined && step.output !== null && (
            <div>
              <p className="text-[10px] text-zinc-500 mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Output
              </p>
              <pre className="text-[9px] font-mono text-zinc-400 bg-zinc-950 rounded p-2 overflow-x-auto max-h-32 border border-zinc-800">
                {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-[11px] border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            onClick={handleCopyError}
          >
            <Copy className="h-3 w-3" />
            Copy All Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { classifyError, ERROR_CATEGORY_META, type ErrorCategory }
