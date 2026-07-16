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
  trigger: 'hover:bg-blue-100 hover:border-blue-300',
  logic: 'hover:bg-green-100 hover:border-green-300',
  ai: 'hover:bg-purple-100 hover:border-purple-300',
  human: 'hover:bg-yellow-100 hover:border-yellow-300',
  action: 'hover:bg-pink-100 hover:border-pink-300',
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
    <div className="w-64 border-r border-zinc-800 bg-zinc-900 overflow-y-auto flex flex-col z-10">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Nodes</h3>
      </div>
      {/* Search input */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-violet-500 focus-visible:border-violet-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="p-3 space-y-4 flex-1 overflow-y-auto">
        {filteredCategories.length === 0 && (
          <div className="py-8 text-center rounded-lg border border-zinc-800 border-dashed">
            <p className="text-xs font-medium text-zinc-500">No results found</p>
          </div>
        )}
        {filteredCategories.map((cat) => (
          <div key={cat.category}>
            <div className="flex items-center gap-2 px-1 mb-1.5">
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${cat.color}`}>
                {cat.label}
              </span>
              <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{cat.types.length}</span>
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
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-zinc-800 transition-colors group"
                  >
                    <div className={`p-1.5 rounded-md bg-zinc-800 group-hover:bg-zinc-700 transition-colors shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${cat.color} shrink-0`} />
                    </div>
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 capitalize">
                      {type.replace('-', ' ')}
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
