'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { getCategoryForType, getSourceHandles, type NodeType, type NodeExecutionStatus } from '@/lib/types'
import { useExecutionStore } from '@/stores/execution-store'
import {
  Zap, Webhook, Clock, Mail, Phone, MessageSquare,
  GitBranch, GitMerge, Repeat, RotateCcw, Timer,
  Brain, Bot, BookOpen, Tags, FileText,
  UserCheck, Eye, AlertTriangle,
  Database, Send, Hash, MessageCircle, Plug,
  Loader2, Check, X, PlayCircle, Layers,
  type LucideIcon,
} from 'lucide-react'

// Map with unique keys to avoid duplicate key issue for email/whatsapp
const TRIGGER_ICONS: Record<string, LucideIcon> = {
  api: Zap, webhook: Webhook, schedule: Clock, email: Mail, 'voice-call': Phone, whatsapp: MessageSquare, subflow: Layers,
}
const LOGIC_ICONS: Record<string, LucideIcon> = {
  condition: GitBranch, switch: GitMerge, loop: Repeat, retry: RotateCcw, delay: Timer,
}
const AI_ICONS: Record<string, LucideIcon> = {
  llm: Brain, agent: Bot, rag: BookOpen, classifier: Tags, summarizer: FileText,
}
const HUMAN_ICONS: Record<string, LucideIcon> = {
  approval: UserCheck, review: Eye, escalation: AlertTriangle,
}
const ACTION_ICONS: Record<string, LucideIcon> = {
  crm: Database, email: Send, slack: Hash, whatsapp: MessageCircle, database: Plug, 'trigger-workflow': PlayCircle,
}

const ALL_ICONS: Record<string, Record<string, LucideIcon>> = {
  trigger: TRIGGER_ICONS,
  logic: LOGIC_ICONS,
  ai: AI_ICONS,
  human: HUMAN_ICONS,
  action: ACTION_ICONS,
}

const FALLBACK_ICON = Zap

// AI node types that support confidence routing
const CONFIDENCE_NODE_TYPES = new Set(['llm', 'classifier', 'agent'])

function AgentNode({ data, selected, id }: NodeProps) {
  // Guard against missing data during rapid re-renders
  const nodeType = (data?.nodeType as NodeType) ?? 'api'
  const label = (data?.label as string) ?? 'Unknown'
  const cat = getCategoryForType(nodeType)
  const categoryIcons = ALL_ICONS[cat.category] ?? {}
  const Icon = categoryIcons[nodeType] ?? FALLBACK_ICON
  const handles = getSourceHandles(nodeType)
  const hasConfidence = CONFIDENCE_NODE_TYPES.has(nodeType)

  // Read execution status for this node from the execution store — use the pre-computed stable map
  const nodeStatus: NodeExecutionStatus | null = useExecutionStore((state) => {
    try {
      return state.nodeStatusMap[id] ?? null
    } catch {
      return null
    }
  })

  // Read the latest execution step for this node to get confidence
  const confidenceValue: number | null = useExecutionStore((state) => {
    try {
      const activeResult = state.results.find(r => r.runId === state.activeResultId)
      if (!activeResult) return null
      const step = activeResult.steps.find(s => s.nodeId === id && s.status === 'success')
      if (!step?.output) return null
      const output = step.output as { confidence?: number }
      return output.confidence ?? null
    } catch {
      return null
    }
  })

  // Determine glow color based on category
  const glowColor = cat.category === 'trigger' ? 'rgba(59,130,246,0.4)' :
    cat.category === 'logic' ? 'rgba(16,185,129,0.4)' :
    cat.category === 'ai' ? 'rgba(139,92,246,0.4)' :
    cat.category === 'human' ? 'rgba(245,158,11,0.4)' : 'rgba(6,182,212,0.4)'

  // Execution state class names
  const executionClasses = (() => {
    switch (nodeStatus) {
      case 'running':
        return 'animate-pulse-glow ring-2 ring-blue-400/50'
      case 'success':
        return 'ring-2 ring-emerald-400/30'
      case 'error':
        return 'ring-2 ring-red-400/30 animate-node-shake'
      case 'pending':
      case 'skipped':
        return 'opacity-60'
      default:
        return ''
    }
  })()

  // Execution state inline styles
  const executionStyle = (() => {
    if (nodeStatus === 'running') {
      return { boxShadow: `0 0 12px 2px rgba(59,130,246,0.5)` }
    }
    if (nodeStatus === 'success') {
      return { boxShadow: `0 0 8px 1px rgba(16,185,129,0.3)` }
    }
    if (nodeStatus === 'error') {
      return { boxShadow: `0 0 8px 1px rgba(239,68,68,0.3)` }
    }
    return undefined
  })()

  // Status badge for execution state
  const statusBadge = (() => {
    switch (nodeStatus) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
      case 'success':
        return <Check className="h-3 w-3 text-emerald-500" />
      case 'error':
        return <X className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  })()

  return (
    <div
      className={`relative rounded-lg border bg-background shadow-lg min-w-[180px] transition-all duration-200 ${
        selected
          ? `${cat.borderColor} shadow-md ring-1 ring-ring`
          : `${cat.borderColor}`
      } ${executionClasses}`}
      style={selected ? { boxShadow: `0 10px 25px ${glowColor}` } : executionStyle}
    >
      {/* Execution status badge */}
      {statusBadge && (
        <div className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-background border border-border shadow-sm">
          {statusBadge}
        </div>
      )}

      {/* Running spinner overlay on icon */}
      {nodeStatus === 'running' && (
        <div className="absolute top-2 left-2 z-10">
          <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
        </div>
      )}

      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-t-md ${cat.bgColor} border-b ${cat.borderColor}`}>
        <Icon className={`h-5 w-5 ${cat.color}`} />
        <span className={`text-sm font-semibold ${cat.color} uppercase tracking-wider`}>{cat.label}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        <p className="text-base font-semibold text-slate-800 leading-tight">{label}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground font-medium uppercase">{nodeType}</p>
          {/* Confidence badge */}
          {hasConfidence && confidenceValue !== null && (
            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
              confidenceValue >= 0.9
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : confidenceValue >= 0.7
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {(confidenceValue * 100).toFixed(0)}%
            </span>
          )}
          {hasConfidence && confidenceValue === null && (
            <span className="text-[10px] font-mono text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
              conf
            </span>
          )}
        </div>
      </div>

      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-4 !h-4 !bg-background !border !border-slate-300"
      />

      {/* Source handles (bottom) */}
      {handles.map((handle, i) => (
        <Handle
          key={handle}
          type="source"
          position={Position.Bottom}
          id={handle}
          style={{
            left: `${(i + 1) / (handles.length + 1) * 100}%`,
          }}
          className={`!w-4 !h-4 !border ${
            handle === 'true' || handle === 'approved' || handle === 'high_confidence'
              ? '!bg-green-100 !border-green-400'
              : handle === 'false' || handle === 'rejected' || handle === 'low_confidence'
              ? '!bg-red-100 !border-red-400'
              : handle === 'error'
              ? '!bg-amber-100 !border-amber-400'
              : '!bg-muted !border-slate-300'
          }`}
        />
      ))}

      {/* Handle labels */}
      {handles.length > 1 && (
        <div className="flex justify-around px-4 pb-3">
          {handles.map((handle) => (
            <span
              key={handle}
              className={`text-[10px] font-semibold uppercase ${
                handle === 'true' || handle === 'approved' || handle === 'high_confidence'
                  ? 'text-green-500'
                  : handle === 'false' || handle === 'rejected' || handle === 'low_confidence'
                  ? 'text-red-500'
                  : 'text-muted-foreground'
              }`}
            >
              {handle}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export const nodeTypes = {
  agent: memo(AgentNode),
}
