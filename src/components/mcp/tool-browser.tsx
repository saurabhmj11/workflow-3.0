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
    <div className="space-y-2">
      {Object.entries(properties).map(([key, val]) => (
        <div key={key} className="flex flex-col gap-0.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">{key}</span>
            {required?.includes(key) && (
              <span className="text-amber-500 font-semibold text-[10px] bg-amber-100 px-1 rounded-sm">NEEDED</span>
            )}
            {val.type && (
              <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">{val.type}</span>
            )}
          </div>
          {val.description && (
            <span className="text-slate-500 font-medium leading-tight ml-1">— {val.description}</span>
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
      <DialogContent className="sm:max-w-3xl bg-white border border-slate-200 rounded-[2rem] text-slate-800 p-0 gap-0 max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-500 border-2 border-indigo-200">
              <Wrench className="h-6 w-6" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-bold text-slate-800">
                Robot Toy Box
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                Pick cool tools and gadgets to give to your robot!
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 py-4 shrink-0 bg-white">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a fun tool..."
              className="h-12 text-base font-medium bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder:text-slate-400 pl-12 rounded-lg focus-visible:ring-0 focus-visible:border-indigo-400 focus-visible:bg-white transition-all shadow-sm"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-6 shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100 h-12 p-1 rounded-lg border-2 border-slate-200 w-full sm:w-auto flex">
              <TabsTrigger value="all" className="rounded-xl flex-1 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                Every Tool!
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-[10px] bg-slate-100 text-slate-500 rounded-lg">
                  {tools.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="builtin" className="rounded-xl flex-1 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                Built-in Magic
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-[10px] bg-slate-100 text-slate-500 rounded-lg">
                  {builtinCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="custom" className="rounded-xl flex-1 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                Custom Toys
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-[10px] bg-slate-100 text-slate-500 rounded-lg">
                  {customCount}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Separator className="bg-slate-200 mt-4 h-1 rounded-full" />

        {/* Content */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Tool List */}
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="p-4 space-y-3">
              {loading && tools.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-indigo-400">
                  <Wrench className="h-10 w-10 " />
                  <p className="text-sm font-bold">Opening the toy box...</p>
                </div>
              )}

              {!loading && filteredTools.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-4">
                    <Wrench className="h-10 w-10 text-slate-300" />
                  </div>
                  <p className="text-base font-bold text-slate-500">No toys found!</p>
                </div>
              )}

              {filteredTools.map((tool) => {
                const isSelected = selectedTool?.id === tool.id
                const isAdded = selectedTools.includes(tool.name)

                return (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool)}
                    className={`w-full text-left p-4 rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                        : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-700">
                            {tool.name}
                          </span>
                          {isAdded && (
                            <Badge className="h-5 text-[10px] font-bold px-1.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-200 rounded-lg">
                              Already Picked!
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`h-5 text-[10px] font-bold px-1.5 rounded-lg border-2 ${
                              tool.source === 'builtin'
                                ? 'border-violet-200 bg-violet-50 text-violet-600'
                                : 'border-cyan-200 bg-cyan-50 text-cyan-600'
                            }`}
                          >
                            {tool.source}
                          </Badge>
                        </div>
                        {tool.description && (
                          <p className="text-xs font-medium text-slate-500 line-clamp-1">
                            {tool.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 bg-slate-100 w-fit px-2 py-0.5 rounded-md border border-slate-200">
                          <Server className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500">{tool.serverName}</span>
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 shrink-0 mt-1 transition-transform ${isSelected ? 'text-indigo-500 translate-x-1' : 'text-slate-300'}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>

          {/* Tool Detail Panel */}
          {selectedTool && (
            <div className="w-72 bg-slate-50 border-l-4 border-slate-200 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-inner">
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">
                  {selectedTool.name}
                </h3>
                {selectedTool.description && (
                  <p className="text-sm font-medium text-slate-500">
                    {selectedTool.description}
                  </p>
                )}
              </div>

              <Separator className="bg-slate-200 h-1 rounded-full" />

              <div className="bg-white p-3 rounded-xl border-2 border-slate-200 shadow-sm flex flex-col gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Where is it?</p>
                  <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg w-fit border border-slate-100">
                    <Server className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{selectedTool.serverName}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kind of Toy</p>
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold px-2 py-0.5 rounded-lg border-2 ${
                      selectedTool.source === 'builtin'
                        ? 'border-violet-200 bg-violet-50 text-violet-600'
                        : 'border-cyan-200 bg-cyan-50 text-cyan-600'
                    }`}
                  >
                    {selectedTool.source}
                  </Badge>
                </div>
              </div>

              {selectedTool.inputSchema && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">How to play with it:</p>
                  <div className="rounded-xl bg-white border-2 border-slate-200 p-3 shadow-sm">
                    <SchemaSummary schema={selectedTool.inputSchema} />
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4">
                <Button
                  size="sm"
                  className={`w-full h-12 rounded-xl text-sm font-semibold shadow-sm transition-all border-b active:border-b-0 active:scale-[0.98] gap-2 ${
                    selectedTools.includes(selectedTool.name)
                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-300'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-700'
                  }`}
                  onClick={() => handleAddTool(selectedTool)}
                >
                  <Plus className="h-5 w-5" />
                  {selectedTools.includes(selectedTool.name) ? 'Give Another One! 🎁' : 'Give to Robot! 🤖'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
