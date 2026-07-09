'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FolderOpen, Trash2, Loader2, FileJson } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { toast } from '@/hooks/use-toast'

interface SavedWorkflow {
  id: string
  name: string
  nodes: unknown[]
  edges: unknown[]
  updatedAt: string
  createdAt: string
}

export function LoadWorkflowDialog() {
  const [open, setOpen] = useState(false)
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const addNode = useWorkflowStore((s) => s.addNode)
  const addEdge = useWorkflowStore((s) => s.addEdge)
  const reset = useWorkflowStore((s) => s.reset)
  const setName = useWorkflowStore((s) => s.setName)
  const setWorkflowId = useWorkflowStore((s) => s.setWorkflowId)

  const fetchWorkflows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/workflows')
      const json = await res.json()
      if (json.ok) {
        setWorkflows(json.data)
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load workflows', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (isOpen) {
        fetchWorkflows()
      }
    },
    [fetchWorkflows]
  )

  const handleLoad = useCallback(
    (wf: SavedWorkflow) => {
      reset()
      setWorkflowId(wf.id)
      setName(wf.name)
      for (const node of wf.nodes as Parameters<typeof addNode>[0][]) {
        addNode(node)
      }
      for (const edge of wf.edges as Parameters<typeof addEdge>[0][]) {
        addEdge(edge)
      }
      toast({ title: 'Workflow loaded', description: `"${wf.name}" loaded successfully` })
      setOpen(false)
    },
    [reset, setWorkflowId, setName, addNode, addEdge]
  )

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      setDeletingId(id)
      try {
        const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
        const json = await res.json()
        if (json.ok) {
          setWorkflows((prev) => prev.filter((w) => w.id !== id))
          // If the deleted workflow is currently loaded, clear workflowId
          const currentWfId = useWorkflowStore.getState().workflowId
          if (currentWfId === id) {
            setWorkflowId(null)
          }
          toast({ title: 'Deleted', description: `"${name}" has been deleted` })
        } else {
          toast({ title: 'Error', description: 'Failed to delete workflow', variant: 'destructive' })
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to delete workflow', variant: 'destructive' })
      } finally {
        setDeletingId(null)
      }
    },
    [setWorkflowId]
  )

  function formatDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl"
          title="Open saved machine"
        >
          <FolderOpen className="h-4 w-4" strokeWidth={3} />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-50 border-slate-200 text-slate-800 sm:max-w-md rounded-[2rem] shadow-xl [&>button]:right-6 [&>button]:top-6 [&>button]:rounded-full [&>button]:bg-slate-200 [&>button]:p-2 [&>button]:text-slate-600 hover:[&>button]:bg-slate-300">
        <DialogHeader className="pt-2 pb-4">
          <DialogTitle className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-lg border-2 border-blue-200">
              <FolderOpen className="h-6 w-6 text-blue-600 fill-blue-200" />
            </div>
            Open Saved Machine!
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-500 bg-white rounded-[1.5rem] border-2 border-slate-200 border-dashed m-2">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <FileJson className="h-8 w-8 text-slate-400" strokeWidth={3} />
            </div>
            <p className="text-base font-bold text-slate-700 text-center">No saved machines yet!</p>
            <p className="text-sm font-medium text-slate-500 mt-1 text-center">Save your current one to see it here</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="flex flex-col gap-3 pr-4 pb-4 pl-2 pt-2">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="flex items-center gap-4 rounded-[1.25rem] border-2 border-slate-200 border-b-[6px] bg-white p-4 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg active:scale-[0.98] active:border-b-2 transition-all cursor-pointer group"
                  onClick={() => handleLoad(wf)}
                >
                  <div className="bg-slate-100 p-2.5 rounded-xl border-2 border-slate-200">
                    <FileJson className="h-5 w-5 text-slate-500" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-800 truncate">{wf.name}</p>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">
                      {(wf.nodes as unknown[]).length} blocks · {formatDate(wf.updatedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all border-2 border-transparent hover:border-red-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(wf.id, wf.name)
                    }}
                    disabled={deletingId === wf.id}
                    title="Delete machine"
                  >
                    {deletingId === wf.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" strokeWidth={3} />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
