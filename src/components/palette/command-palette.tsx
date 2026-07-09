'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Workflow,
  Play,
  Settings,
  BarChart3,
  Puzzle,
  ShieldCheck,
  Zap,
  Code2,
  Database,
  Mail,
  Wand2,
  Eye,
  Globe,
  KeyRound,
  ArrowRight,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  category: string
  icon: React.ElementType
  action?: () => void
  href?: string
  badge?: string
  keywords?: string[]
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'nav-dashboard', label: 'Dashboard', description: 'View platform metrics and activity', category: 'Navigation', icon: BarChart3, href: '/dashboard' },
  { id: 'nav-builder', label: 'Workflow Builder', description: 'Create and edit workflows visually', category: 'Navigation', icon: Workflow, href: '/build' },
  { id: 'nav-analytics', label: 'Analytics', description: 'Execution stats and performance', category: 'Navigation', icon: BarChart3, href: '/analytics' },
  { id: 'nav-plugins', label: 'Plugins', description: 'Manage workflow plugins', category: 'Navigation', icon: Puzzle, href: '/plugins' },
  { id: 'nav-observability', label: 'Observability', description: 'Traces, logs, and metrics', category: 'Navigation', icon: Eye, href: '/observability' },
  { id: 'nav-deployments', label: 'Deployments', description: 'Manage workflow environments', category: 'Navigation', icon: Globe, href: '/deploy' },
  { id: 'nav-memory', label: 'Agent Memory', description: 'Customer context and interactions', category: 'Navigation', icon: Database, href: '/memory' },
  { id: 'nav-testing', label: 'Testing', description: 'Workflow testing framework', category: 'Navigation', icon: ShieldCheck, href: '/test' },
  { id: 'nav-integrations', label: 'Integrations', description: 'Connect external services', category: 'Navigation', icon: Zap, href: '/integrations' },
  { id: 'nav-settings', label: 'Settings', description: 'Platform and account settings', category: 'Navigation', icon: Settings, href: '/settings' },
  { id: 'nav-audit', label: 'Audit Log', description: 'Activity and security audit trail', category: 'Navigation', icon: ShieldCheck, href: '/audit' },

  // Builder actions (available from everywhere)
  { id: 'builder-new', label: 'New Workflow', description: 'Start a blank workflow in the builder', category: 'Builder', icon: Workflow, href: '/build', keywords: ['create', 'blank', 'empty'] },
  { id: 'builder-ai', label: 'AI Generate Workflow', description: 'Generate a workflow from a text prompt', category: 'Builder', icon: Wand2, href: '/build?ai=true', badge: 'AI', keywords: ['generate', 'prompt', 'copilot'] },
  { id: 'builder-template', label: 'Browse Templates', description: 'Load a pre-built workflow template', category: 'Builder', icon: Workflow, href: '/build?templates=true', keywords: ['template', 'example', 'preset'] },

  // Node Types
  { id: 'node-llm', label: 'Add LLM Node', description: 'OpenAI / Gemini language model', category: 'Nodes', icon: Code2, href: '/build', badge: 'AI', keywords: ['gpt', 'openai', 'ai', 'chat'] },
  { id: 'node-agent', label: 'Add AI Agent', description: 'Autonomous agent with tools', category: 'Nodes', icon: Code2, href: '/build', badge: 'AI', keywords: ['agent', 'autonomous', 'tools'] },
  { id: 'node-webhook', label: 'Add Webhook Trigger', description: 'Trigger workflow via HTTP webhook', category: 'Nodes', icon: Zap, href: '/build', keywords: ['webhook', 'http', 'trigger'] },
  { id: 'node-schedule', label: 'Add Schedule Trigger', description: 'Cron-based scheduled trigger', category: 'Nodes', icon: Zap, href: '/build', keywords: ['cron', 'schedule', 'timer'] },
  { id: 'node-email', label: 'Add Email Trigger', description: 'Trigger on incoming emails (IMAP)', category: 'Nodes', icon: Mail, href: '/build', keywords: ['email', 'imap', 'inbox'] },
  { id: 'node-slack', label: 'Add Slack Action', description: 'Post messages to Slack channels', category: 'Nodes', icon: Mail, href: '/build', keywords: ['slack', 'message', 'notify'] },
  { id: 'node-code', label: 'Add Code Node', description: 'Run custom JavaScript/Python code', category: 'Nodes', icon: Code2, href: '/build', keywords: ['code', 'script', 'javascript', 'python'] },

  // Quick actions
  { id: 'quick-secrets', label: 'Manage Secrets', description: 'Add/edit API keys and credentials', category: 'Quick Actions', icon: KeyRound, href: '/settings?tab=secrets', keywords: ['api key', 'credential', 'token', 'password'] },
  { id: 'quick-run', label: 'Run Last Workflow', description: 'Execute the most recent workflow', category: 'Quick Actions', icon: Play, href: '/build', keywords: ['run', 'execute', 'start'] },
]

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? COMMANDS.filter((cmd) => {
        const q = query.toLowerCase()
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.category.toLowerCase().includes(q) ||
          cmd.keywords?.some((k) => k.includes(q))
        )
      })
    : COMMANDS.slice(0, 12) // Show top 12 by default

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    acc[item.category] = acc[item.category] ?? []
    acc[item.category].push(item)
    return acc
  }, {})

  const allItems = filtered

  const handleSelect = useCallback(
    (cmd: CommandItem) => {
      onOpenChange(false)
      setQuery('')
      if (cmd.action) {
        cmd.action()
      } else if (cmd.href) {
        router.push(cmd.href)
      }
    },
    [onOpenChange, router]
  )

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = allItems[selectedIndex]
        if (item) handleSelect(item)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, allItems, selectedIndex, handleSelect])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  const CATEGORY_ICONS: Record<string, string> = {
    Navigation: '→',
    Builder: '⚡',
    Nodes: '◆',
    'Quick Actions': '✦',
  }

  let itemIndex = 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl bg-zinc-900 border-zinc-700 shadow-2xl shadow-black/50 overflow-hidden gap-0">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, nodes, pages..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-4 py-1.5 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {CATEGORY_ICONS[category] ?? '•'} {category}
                </span>
              </div>
              {items.map((cmd) => {
                const isSelected = itemIndex === selectedIndex
                const currentIndex = itemIndex
                itemIndex++
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group ${
                      isSelected ? 'bg-violet-600/20 border-l-2 border-violet-500' : 'hover:bg-zinc-800/50 border-l-2 border-transparent'
                    }`}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    onClick={() => handleSelect(cmd)}
                  >
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                    }`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-100 font-medium truncate">{cmd.label}</span>
                        {cmd.badge && (
                          <Badge variant="outline" className="text-[9px] border-violet-500/30 text-violet-400 px-1 py-0">
                            {cmd.badge}
                          </Badge>
                        )}
                      </div>
                      {cmd.description && (
                        <p className="text-xs text-zinc-500 truncate">{cmd.description}</p>
                      )}
                    </div>
                    <ArrowRight className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isSelected ? 'text-violet-400 opacity-100' : 'opacity-0 group-hover:opacity-100 text-zinc-500'}`} />
                  </button>
                )
              })}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Search className="h-8 w-8 text-zinc-700" />
              <p className="text-sm text-zinc-500">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-zinc-600">Try searching for nodes, pages, or actions</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span className="flex items-center gap-1"><kbd className="bg-zinc-800 border border-zinc-700 rounded px-1">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-zinc-800 border border-zinc-700 rounded px-1">↵</kbd> Select</span>
          </div>
          <span className="text-[10px] text-zinc-600">{filtered.length} results</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Global Keyboard Hook ────────────────────────
// Use this hook in your root layout to register Cmd+K

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return { open, setOpen }
}
