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
        className="bg-white border border-slate-200 sm:rounded-l-[2rem] text-slate-800 w-full sm:max-w-md p-0 shadow-2xl"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50 sm:rounded-tl-[1.5rem]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-500 border-2 border-indigo-200">
              <GitBranch className="h-5 w-5" />
            </div>
            <SheetTitle className="text-slate-800 font-bold text-xl">Time Machine!</SheetTitle>
          </div>
          <SheetDescription className="text-slate-500 font-medium text-sm">
            Let's travel back in time to see older versions of your amazing creation!
          </SheetDescription>
        </SheetHeader>

        {previewVersion && (
          <div className="m-4 px-4 py-3 bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-3 shadow-sm">
            <div className="bg-amber-200 p-1.5 rounded-xl text-amber-600 border-2 border-amber-300">
              <Clock className="h-4 w-4 shrink-0" />
            </div>
            <span className="text-sm font-bold text-amber-800 flex-1 leading-snug">
              Looking at version {previewVersion.version}! Save it to keep it.
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-sm font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-200 rounded-xl px-3"
              onClick={() => setPreviewVersion(null)}
            >
              Go Back
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
              <p className="text-indigo-600 font-bold">Warming up the time machine...</p>
            </div>
          ) : !workflowId ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-4">
                <GitCommitHorizontal className="h-12 w-12 text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-600">Nothing here yet!</p>
              <p className="text-sm font-medium text-slate-500 mt-1">Save your work to start tracking time</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-4">
                <GitCommitHorizontal className="h-12 w-12 text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-600">No history found!</p>
              <p className="text-sm font-medium text-slate-500 mt-1">Save your work to create your first time snapshot</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="p-6">
                <div className="relative">
                  {/* Timeline connecting line */}
                  <div className="absolute left-[19px] top-6 bottom-6 w-1 bg-slate-200 rounded-full" />

                  <div className="flex flex-col gap-4">
                    {versions.map((v, idx) => {
                      const isCurrent = isCurrentVersion(v)
                      const isFirst = idx === 0
                      const isRestoring = restoringId === v.id

                      return (
                        <div key={v.id} className="relative flex gap-4 group">
                          {/* Timeline dot */}
                          <div className="relative z-10 flex items-start pt-5">
                            <div
                              className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 ${
                                isCurrent
                                  ? 'border-emerald-300 bg-emerald-100'
                                  : 'border-slate-300 bg-white group-hover:border-indigo-300 group-hover:bg-indigo-50'
                              } transition-all duration-300 shadow-sm`}
                            >
                              <div
                                className={`h-3 w-3 rounded-full ${
                                  isCurrent ? 'bg-emerald-500' : 'bg-slate-400 group-hover:bg-indigo-400'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Version card */}
                          <div
                            className={`flex-1 rounded-lg border p-4 transition-all duration-300 shadow-sm ${
                              isCurrent
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md hover:-translate-y-1'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                className={`text-xs font-bold px-2 py-1 rounded-xl ${
                                  isCurrent
                                    ? 'bg-emerald-200 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600 border-2 border-slate-200'
                                }`}
                                variant="secondary"
                              >
                                v{v.version}
                              </Badge>
                              {isCurrent && (
                                <Badge className="text-xs font-bold bg-emerald-500 text-white border-2 border-emerald-600 rounded-xl px-2 py-1">
                                  Current Time
                                </Badge>
                              )}
                              {isFirst && !isCurrent && (
                                <Badge className="text-xs font-bold bg-indigo-100 text-indigo-700 border-2 border-indigo-200 rounded-xl px-2 py-1">
                                  Newest
                                </Badge>
                              )}
                              <span className="text-xs font-bold text-slate-400 ml-auto">
                                {formatRelativeDate(v.createdAt)}
                              </span>
                            </div>

                            {v.changeNote && (
                              <p className="text-sm font-medium text-slate-700 mb-3 bg-white p-3 rounded-xl border-2 border-slate-100 shadow-sm">
                                {v.changeNote}
                              </p>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border-2 border-slate-100 w-fit">
                                <span>🧩 {v.nodeCount} block{v.nodeCount !== 1 ? 's' : ''}</span>
                                <span>·</span>
                                <span>🔗 {v.edgeCount} line{v.edgeCount !== 1 ? 's' : ''}</span>
                              </div>

                              <div className="sm:ml-auto flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                                {!isCurrent && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 px-3"
                                      onClick={() => handlePreview(v)}
                                      disabled={isRestoring}
                                    >
                                      Peek Inside 👀
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="h-8 rounded-xl font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 border-b border-amber-600 px-3 active:border-b-0 active:scale-[0.98] transition-all"
                                          disabled={isRestoring}
                                        >
                                          {isRestoring ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <>
                                              <RotateCcw className="h-4 w-4 mr-1.5" />
                                              Travel Back!
                                            </>
                                          )}
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-white border border-amber-200 rounded-xl p-6 shadow-2xl sm:max-w-md">
                                        <AlertDialogHeader>
                                          <div className="mx-auto bg-amber-100 p-4 rounded-full border border-amber-200 mb-2">
                                            <RotateCcw className="h-8 w-8 text-amber-500" />
                                          </div>
                                          <AlertDialogTitle className="text-2xl font-semibold text-slate-800 text-center">Travel back to v{v.version}?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-base font-medium text-slate-600 text-center mt-2">
                                            We'll replace your blocks right now with the ones from this time snapshot!
                                            Don't worry, we'll save your current blocks as a new snapshot just in case.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="sm:justify-center gap-2 sm:gap-4 mt-6">
                                          <AlertDialogCancel className="rounded-lg font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-100 px-6 h-12 w-full sm:w-auto mt-0">
                                            Nevermind
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            className="rounded-lg font-bold bg-amber-400 hover:bg-amber-500 text-amber-950 border-b border-amber-600 px-6 h-12 active:border-b-0 active:scale-[0.98] transition-all w-full sm:w-auto"
                                            onClick={() => handleRestore(v)}
                                          >
                                            Yes, Let's Go! 🚀
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
