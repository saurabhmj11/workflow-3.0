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
          className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
          title="Load workflow"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Load Workflow</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <FileJson className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">No saved workflows yet</p>
            <p className="text-xs text-zinc-600">Save your current workflow to see it here</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="flex flex-col gap-1.5 pr-2">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-800/50 p-3 hover:bg-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group"
                  onClick={() => handleLoad(wf)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{wf.name}</p>
                    <p className="text-[11px] text-zinc-500">
                      {(wf.nodes as unknown[]).length} node{(wf.nodes as unknown[]).length !== 1 ? 's' : ''} · {formatDate(wf.updatedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(wf.id, wf.name)
                    }}
                    disabled={deletingId === wf.id}
                    title="Delete workflow"
                  >
                    {deletingId === wf.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
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
