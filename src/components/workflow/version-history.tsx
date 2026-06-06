'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { GitCommitHorizontal, RotateCcw, Loader2, Clock, GitBranch } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { toast } from '@/hooks/use-toast'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

interface VersionEntry {
  id: string
  workflowId: string
  version: number
  name: string
  description?: string
  changeNote?: string
  nodeCount: number
  edgeCount: number
  createdAt: string
}

interface VersionHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVersion: number | null
  onVersionRestored: () => void
}

function formatRelativeDate(iso: string) {
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

export function VersionHistory({ open, onOpenChange, currentVersion, onVersionRestored }: VersionHistoryProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [previewVersion, setPreviewVersion] = useState<VersionEntry | null>(null)

  const workflowId = useWorkflowStore((s) => s.workflowId)
  const setNodes = useWorkflowStore((s) => s.setNodes)
  const setEdges = useWorkflowStore((s) => s.setEdges)
  const addNode = useWorkflowStore((s) => s.addNode)
  const addEdge = useWorkflowStore((s) => s.addEdge)
  const reset = useWorkflowStore((s) => s.reset)
  const setName = useWorkflowStore((s) => s.setName)

  const fetchVersions = useCallback(async () => {
    if (!workflowId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/versions`)
      const json = await res.json()
      if (json.ok) {
        setVersions(json.data)
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load versions', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    if (open && workflowId) {
      fetchVersions()
    }
  }, [open, workflowId, fetchVersions])

  const handleRestore = useCallback(
    async (versionEntry: VersionEntry) => {
      if (!workflowId) return
      setRestoringId(versionEntry.id)
      try {
        // First, restore on the server
        const res = await fetch(`/api/workflows/${workflowId}/versions/${versionEntry.version}`, {
          method: 'POST',
        })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error)

        // Then fetch the version snapshot to load into the store
        const snapRes = await fetch(`/api/workflows/${workflowId}/versions/${versionEntry.version}`)
        const snapJson = await snapRes.json()
        if (!snapJson.ok) throw new Error(snapJson.error)

        const snapshot = snapJson.data.snapshot as { nodes: NodeDefinition[]; edges: EdgeDefinition[] }

        // Update the local store
        reset()
        setName(versionEntry.name)
        for (const node of snapshot.nodes) {
          addNode(node)
        }
        for (const edge of snapshot.edges) {
          addEdge(edge)
        }

        toast({
          title: 'Version restored',
          description: `Rolled back to v${versionEntry.version}`,
        })

        // Refresh the versions list
        await fetchVersions()
        onVersionRestored()
      } catch (err) {
        toast({
          title: 'Restore failed',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        setRestoringId(null)
      }
    },
    [workflowId, reset, setName, addNode, addEdge, fetchVersions, onVersionRestored]
  )

  const handlePreview = useCallback(async (versionEntry: VersionEntry) => {
    if (!workflowId) return
    try {
      const res = await fetch(`/api/workflows/${workflowId}/versions/${versionEntry.version}`)
      const json = await res.json()
      if (json.ok) {
        const snapshot = json.data.snapshot as { nodes: NodeDefinition[]; edges: EdgeDefinition[] }
        reset()
        for (const node of snapshot.nodes) {
          addNode(node)
        }
        for (const edge of snapshot.edges) {
          addEdge(edge)
        }
        setPreviewVersion(versionEntry)
        toast({
          title: `Previewing v${versionEntry.version}`,
          description: 'Click Save to keep these changes, or restore another version',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to preview version', variant: 'destructive' })
    }
  }, [workflowId, reset, addNode, addEdge])

  const isCurrentVersion = useCallback(
    (v: VersionEntry) => currentVersion !== null && v.version === currentVersion,
    [currentVersion]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-zinc-900 border-zinc-700 text-zinc-100 w-full sm:max-w-md p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-emerald-400" />
            <SheetTitle className="text-zinc-100 text-base">Version History</SheetTitle>
          </div>
          <SheetDescription className="text-zinc-500 text-xs">
            View, preview, and restore previous versions of your workflow
          </SheetDescription>
        </SheetHeader>

        {previewVersion && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-300 flex-1">
              Previewing v{previewVersion.version}. Save to keep or restore another version.
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 px-2"
              onClick={() => setPreviewVersion(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : !workflowId ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <GitCommitHorizontal className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No workflow loaded</p>
              <p className="text-xs text-zinc-600 mt-1">Save your workflow first to enable versioning</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <GitCommitHorizontal className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No versions yet</p>
              <p className="text-xs text-zinc-600 mt-1">Save your workflow to create the first version</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="p-4">
                <div className="relative">
                  {/* Timeline connecting line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />

                  <div className="flex flex-col gap-1">
                    {versions.map((v, idx) => {
                      const isCurrent = isCurrentVersion(v)
                      const isFirst = idx === 0
                      const isRestoring = restoringId === v.id

                      return (
                        <div key={v.id} className="relative flex gap-3 group">
                          {/* Timeline dot */}
                          <div className="relative z-10 flex items-start pt-3">
                            <div
                              className={`h-[22px] w-[22px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isCurrent
                                  ? 'border-emerald-500 bg-emerald-500/20'
                                  : 'border-zinc-600 bg-zinc-800 group-hover:border-zinc-500'
                              } transition-colors`}
                            >
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  isCurrent ? 'bg-emerald-400' : 'bg-zinc-500'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Version card */}
                          <div
                            className={`flex-1 rounded-lg border p-3 transition-colors ${
                              isCurrent
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : 'border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/60 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                className={`text-[10px] font-mono px-1.5 py-0 h-5 ${
                                  isCurrent
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-zinc-700/50 text-zinc-400 border-zinc-600'
                                }`}
                                variant="outline"
                              >
                                v{v.version}
                              </Badge>
                              {isCurrent && (
                                <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30 h-5" variant="outline">
                                  Current
                                </Badge>
                              )}
                              {isFirst && !isCurrent && (
                                <Badge className="text-[10px] bg-zinc-700/50 text-zinc-400 border-zinc-600 h-5" variant="outline">
                                  Latest
                                </Badge>
                              )}
                              <span className="text-[10px] text-zinc-600 ml-auto">
                                {formatRelativeDate(v.createdAt)}
                              </span>
                            </div>

                            {v.changeNote && (
                              <p className="text-xs text-zinc-300 mb-1.5 leading-relaxed">
                                {v.changeNote}
                              </p>
                            )}

                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-zinc-500">
                                {v.nodeCount} node{v.nodeCount !== 1 ? 's' : ''} · {v.edgeCount} edge{v.edgeCount !== 1 ? 's' : ''}
                              </span>

                              <div className="ml-auto flex items-center gap-1.5">
                                {!isCurrent && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 px-2"
                                      onClick={() => handlePreview(v)}
                                      disabled={isRestoring}
                                    >
                                      Preview
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 px-2"
                                          disabled={isRestoring}
                                        >
                                          {isRestoring ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <>
                                              <RotateCcw className="h-3 w-3 mr-1" />
                                              Restore
                                            </>
                                          )}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-zinc-100">Restore to v{v.version}?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-zinc-400">
                                            This will replace your current workflow with the state from v{v.version}
                                            ({v.nodeCount} nodes, {v.edgeCount} edges). A new version will be created to record this rollback.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-amber-600 hover:bg-amber-500 text-white"
                                            onClick={() => handleRestore(v)}
                                          >
                                            Restore v{v.version}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
