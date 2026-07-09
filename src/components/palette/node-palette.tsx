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
    <div className="w-72 border-r border-slate-200 bg-white overflow-y-auto flex flex-col shadow-sm z-10">
      <div className="p-4 border-b border-border text-center">
        <h3 className="text-xl font-semibold text-foreground">Node Palette</h3>
        <p className="text-sm font-medium text-muted-foreground mt-1">Drag nodes to canvas</p>
      </div>
      {/* Search input */}
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Find a block..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10 pr-10 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {filteredCategories.length === 0 && (
          <div className="py-10 text-center bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <p className="text-xl font-medium text-muted-foreground">No results found</p>
            <p className="text-sm text-muted-foreground mt-2">Try a different search term.</p>
          </div>
        )}
        {filteredCategories.map((cat) => (
          <div key={cat.category}>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-t-md border-b border-border">
              <span className={`text-xs font-semibold uppercase tracking-wider ${cat.color.replace('400', '600')}`}>
                {cat.label}
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{cat.types.length}</span>
            </div>
            <div className="space-y-2 pt-3 pb-1">
              {cat.types.map((type) => {
                const Icon = getNodeIcon(type, cat.category)
                return (
                  <button
                    key={`${cat.category}-${type}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, type as NodeType, cat)}
                    onClick={() => handleClick(type as NodeType, cat)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left border border-transparent hover:bg-muted bg-background hover:border-border transition-colors group`}
                  >
                    <div className={`p-1.5 rounded-md ${cat.color.replace('text-', 'bg-').replace('400', '100')}`}>
                      <Icon className={`h-5 w-5 ${cat.color.replace('400', '600')} shrink-0`} />
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-foreground capitalize">
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
