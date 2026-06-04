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
  Loader2, Check, X,
  type LucideIcon,
} from 'lucide-react'

// Map with unique keys to avoid duplicate key issue for email/whatsapp
const TRIGGER_ICONS: Record<string, LucideIcon> = {
  api: Zap, webhook: Webhook, schedule: Clock, email: Mail, 'voice-call': Phone, whatsapp: MessageSquare,
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
  crm: Database, email: Send, slack: Hash, whatsapp: MessageCircle, database: Plug,
}

const ALL_ICONS: Record<string, Record<string, LucideIcon>> = {
  trigger: TRIGGER_ICONS,
  logic: LOGIC_ICONS,
  ai: AI_ICONS,
  human: HUMAN_ICONS,
  action: ACTION_ICONS,
}

const FALLBACK_ICON = Zap

function AgentNode({ data, selected, id }: NodeProps) {
  const nodeType = data.nodeType as NodeType
  const label = data.label as string
  const cat = getCategoryForType(nodeType)
  const categoryIcons = ALL_ICONS[cat.category] ?? {}
  const Icon = categoryIcons[nodeType] ?? FALLBACK_ICON
  const handles = getSourceHandles(nodeType)

  // Read execution status for this node from the execution store — use the pre-computed stable map
  const nodeStatus: NodeExecutionStatus | null = useExecutionStore((state) => {
    return state.nodeStatusMap[id] ?? null
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
      className={`relative rounded-lg border-2 bg-zinc-900 shadow-lg min-w-[160px] transition-all duration-200 ${
        selected
          ? `${cat.borderColor} shadow-2xl ring-2 ring-white/20`
          : `${cat.borderColor}`
      } ${executionClasses}`}
      style={selected ? { boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}` } : executionStyle}
    >
      {/* Execution status badge */}
      {statusBadge && (
        <div className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 shadow-sm">
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
      <div className={`flex items-center gap-2 px-3 py-2 rounded-t-md ${cat.bgColor} border-b ${cat.borderColor}`}>
        <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
        <span className={`text-xs font-semibold ${cat.color} uppercase tracking-wider`}>{cat.label}</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-white leading-tight">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5 font-mono">{nodeType}</p>
      </div>

      {/* Target handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!w-2.5 !h-2.5 !bg-zinc-600 !border-2 !border-zinc-400"
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
          className={`!w-2.5 !h-2.5 !border-2 ${
            handle === 'true' || handle === 'approved'
              ? '!bg-emerald-500 !border-emerald-300'
              : handle === 'false' || handle === 'rejected'
              ? '!bg-red-500 !border-red-300'
              : handle === 'error'
              ? '!bg-amber-500 !border-amber-300'
              : '!bg-zinc-600 !border-zinc-400'
          }`}
        />
      ))}

      {/* Handle labels */}
      {handles.length > 1 && (
        <div className="flex justify-around px-3 pb-2">
          {handles.map((handle) => (
            <span
              key={handle}
              className={`text-[9px] font-mono ${
                handle === 'true' || handle === 'approved'
                  ? 'text-emerald-400'
                  : handle === 'false' || handle === 'rejected'
                  ? 'text-red-400'
                  : 'text-zinc-500'
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
