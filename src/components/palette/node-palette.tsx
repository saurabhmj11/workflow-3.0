'use client'

import { useState, useMemo } from 'react'
import { NODE_CATEGORIES, type NodeType, type NodeCategory } from '@/lib/types'
import { useWorkflowStore } from '@/stores/workflow-store'
import { Input } from '@/components/ui/input'
import {
  Zap, Webhook, Clock, Mail, Phone, MessageSquare,
  GitBranch, GitMerge, Repeat, RotateCcw, Timer,
  Brain, Bot, BookOpen, Tags, FileText,
  UserCheck, Eye, AlertTriangle,
  Database, Send, Hash, MessageCircle, Plug,
  Search, X, PlayCircle, Layers,
} from 'lucide-react'

function getNodeIcon(type: string, category: NodeCategory): typeof Zap {
  if (type === 'email') return category === 'trigger' ? Mail : Send
  if (type === 'whatsapp') return category === 'trigger' ? MessageSquare : MessageCircle
  const map: Record<string, typeof Zap> = {
    api: Zap, webhook: Webhook, schedule: Clock, 'voice-call': Phone, subflow: Layers,
    condition: GitBranch, switch: GitMerge, loop: Repeat, retry: RotateCcw, delay: Timer,
    llm: Brain, agent: Bot, rag: BookOpen, classifier: Tags, summarizer: FileText,
    approval: UserCheck, review: Eye, escalation: AlertTriangle,
    crm: Database, slack: Hash, database: Plug, 'trigger-workflow': PlayCircle,
  }
  return map[type] ?? Zap
}

const HOVER_BG: Record<string, string> = {
  trigger: 'hover:bg-blue-500/10',
  logic: 'hover:bg-emerald-500/10',
  ai: 'hover:bg-violet-500/10',
  human: 'hover:bg-amber-500/10',
  action: 'hover:bg-cyan-500/10',
}

let nodeCounter = 0

export function NodePalette() {
  const addNode = useWorkflowStore((s) => s.addNode)
  const [search, setSearch] = useState('')

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return NODE_CATEGORIES
    const q = search.toLowerCase().trim()
    return NODE_CATEGORIES.map((cat) => ({
      ...cat,
      types: cat.types.filter((type) => type.toLowerCase().includes(q)),
    })).filter((cat) => cat.types.length > 0)
  }, [search])

  const handleDragStart = (e: React.DragEvent, type: NodeType, category: typeof NODE_CATEGORIES[number]) => {
    e.dataTransfer.setData('application/openworkflow', JSON.stringify({ type, category: category.category }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleClick = (type: NodeType, category: typeof NODE_CATEGORIES[number]) => {
    const id = `node-${++nodeCounter}-${Date.now()}`
    const existingCount = useWorkflowStore.getState().nodes.length
    const x = 250 + (existingCount % 4) * 220
    const y = 50 + Math.floor(existingCount / 4) * 150

    addNode({
      id,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}`,
      category: category.category,
      config: {},
      position: { x, y },
    })
  }

  return (
    <div className="w-56 border-r border-zinc-800 bg-zinc-900/80 overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Node Palette</h3>
        <p className="text-[10px] text-zinc-600 mt-0.5">Click or drag to add</p>
      </div>
      {/* Search input */}
      <div className="p-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 pr-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-zinc-600"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="p-2 space-y-3 flex-1 overflow-y-auto">
        {filteredCategories.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-xs text-zinc-500">No results</p>
            <p className="text-[10px] text-zinc-600 mt-1">Try a different search term</p>
          </div>
        )}
        {filteredCategories.map((cat) => (
          <div key={cat.category}>
            <div className="flex items-center gap-1.5 px-1 py-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${cat.color}`}>
                {cat.label}
              </span>
              <span className="text-[10px] text-zinc-600">({cat.types.length})</span>
            </div>
            <div className="space-y-0.5">
              {cat.types.map((type) => {
                const Icon = getNodeIcon(type, cat.category)
                return (
                  <button
                    key={`${cat.category}-${type}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, type as NodeType, cat)}
                    onClick={() => handleClick(type as NodeType, cat)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left ${HOVER_BG[cat.category]} transition-colors group`}
                  >
                    <Icon className={`h-3 w-3 ${cat.color} shrink-0`} />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      {type}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
