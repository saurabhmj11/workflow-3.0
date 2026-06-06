'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Wrench,
  Plus,
  Server,
  ChevronRight,
  X,
} from 'lucide-react'

interface MCPToolItem {
  id: string
  name: string
  description?: string | null
  inputSchema?: Record<string, unknown> | null
  annotations?: Record<string, unknown> | null
  serverName: string
  source: 'builtin' | 'custom'
}

interface ToolBrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddTool?: (toolName: string) => void
  selectedTools?: string[]
}

function SchemaSummary({ schema }: { schema?: Record<string, unknown> | null }) {
  if (!schema || typeof schema !== 'object') return null

  const properties = schema.properties as Record<string, { type?: string; description?: string }> | undefined
  const required = schema.required as string[] | undefined

  if (!properties || Object.keys(properties).length === 0) return null

  return (
    <div className="mt-1.5 space-y-0.5">
      {Object.entries(properties).map(([key, val]) => (
        <div key={key} className="flex items-center gap-1.5 text-[10px]">
          <span className="font-mono text-zinc-300">{key}</span>
          {val.type && (
            <span className="text-zinc-500">{val.type}</span>
          )}
          {required?.includes(key) && (
            <span className="text-amber-400">*</span>
          )}
          {val.description && (
            <span className="text-zinc-600 truncate">— {val.description}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function ToolBrowser({ open, onOpenChange, onAddTool, selectedTools = [] }: ToolBrowserProps) {
  const [tools, setTools] = useState<MCPToolItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTool, setSelectedTool] = useState<MCPToolItem | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  // Fetch tools
  const fetchTools = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mcp/tools${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      const json = await res.json()
      if (json.ok) {
        setTools(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch MCP tools:', err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (open) {
      fetchTools()
    }
  }, [open, fetchTools])

  // Debounced search
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      fetchTools()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, open, fetchTools])

  const filteredTools = useMemo(() => {
    if (activeTab === 'all') return tools
    if (activeTab === 'builtin') return tools.filter((t) => t.source === 'builtin')
    if (activeTab === 'custom') return tools.filter((t) => t.source === 'custom')
    return tools
  }, [tools, activeTab])

  const builtinCount = useMemo(() => tools.filter((t) => t.source === 'builtin').length, [tools])
  const customCount = useMemo(() => tools.filter((t) => t.source === 'custom').length, [tools])

  const handleAddTool = useCallback(
    (tool: MCPToolItem) => {
      onAddTool?.(tool.name)
    },
    [onAddTool]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-zinc-900 border-zinc-700 text-zinc-100 p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="p-4 pb-0 shrink-0">
          <DialogTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-violet-400" />
            MCP Tool Browser
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Browse and discover tools available for AI agent nodes
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="h-8 text-xs bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 pl-8 focus-visible:ring-zinc-600"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 hover:text-zinc-300"
                onClick={() => setSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-950 h-7 p-0.5">
              <TabsTrigger value="all" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
                All
                <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[9px] bg-zinc-700 text-zinc-300">
                  {tools.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="builtin" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
                Builtin
                <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[9px] bg-zinc-700 text-zinc-300">
                  {builtinCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
                Custom
                <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[9px] bg-zinc-700 text-zinc-300">
                  {customCount}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Separator className="bg-zinc-800 mt-2" />

        {/* Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Tool List */}
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="p-2 space-y-1">
              {loading && tools.length === 0 && (
                <div className="flex items-center justify-center py-8 text-zinc-500">
                  <p className="text-xs">Loading tools...</p>
                </div>
              )}

              {!loading && filteredTools.length === 0 && (
                <div className="flex items-center justify-center py-8 text-zinc-500">
                  <p className="text-xs">No tools found</p>
                </div>
              )}

              {filteredTools.map((tool) => {
                const isSelected = selectedTool?.id === tool.id
                const isAdded = selectedTools.includes(tool.name)

                return (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool)}
                    className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                      isSelected
                        ? 'bg-zinc-800 border-zinc-600'
                        : 'bg-transparent border-transparent hover:bg-zinc-800/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-zinc-200 font-mono">
                            {tool.name}
                          </span>
                          {isAdded && (
                            <Badge className="h-4 text-[9px] px-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              added
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`h-4 text-[9px] px-1 ${
                              tool.source === 'builtin'
                                ? 'border-violet-500/30 text-violet-400'
                                : 'border-cyan-500/30 text-cyan-400'
                            }`}
                          >
                            {tool.source}
                          </Badge>
                        </div>
                        {tool.description && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                            {tool.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Server className="h-2.5 w-2.5 text-zinc-600" />
                          <span className="text-[10px] text-zinc-600">{tool.serverName}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0 mt-0.5" />
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>

          {/* Tool Detail Panel */}
          {selectedTool && (
            <div className="w-64 border-l border-zinc-800 p-3 flex flex-col gap-3 overflow-y-auto shrink-0">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 font-mono">
                  {selectedTool.name}
                </h3>
                {selectedTool.description && (
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {selectedTool.description}
                  </p>
                )}
              </div>

              <Separator className="bg-zinc-800" />

              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Server</p>
                <div className="flex items-center gap-1.5">
                  <Server className="h-3 w-3 text-zinc-500" />
                  <span className="text-xs text-zinc-300">{selectedTool.serverName}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Source</p>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    selectedTool.source === 'builtin'
                      ? 'border-violet-500/30 text-violet-400'
                      : 'border-cyan-500/30 text-cyan-400'
                  }`}
                >
                  {selectedTool.source}
                </Badge>
              </div>

              {selectedTool.inputSchema && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Input Schema</p>
                  <div className="rounded-md bg-zinc-950 border border-zinc-800 p-2">
                    <SchemaSummary schema={selectedTool.inputSchema} />
                  </div>
                </div>
              )}

              <div className="mt-auto pt-2">
                <Button
                  size="sm"
                  className={`w-full h-7 text-xs gap-1.5 ${
                    selectedTools.includes(selectedTool.name)
                      ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                  }`}
                  onClick={() => handleAddTool(selectedTool)}
                >
                  <Plus className="h-3 w-3" />
                  {selectedTools.includes(selectedTool.name) ? 'Add Again' : 'Add to Agent'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
