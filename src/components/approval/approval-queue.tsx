'use client'

import { useApprovalStore } from '@/stores/approval-store'
import { useExecutionStore } from '@/stores/execution-store'
import { resumeWorkflow } from '@/lib/engine'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Clock, Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from '@/hooks/use-toast'

export function ApprovalQueue() {
  const requests = useApprovalStore((s) => s.requests)
  const updateStatus = useApprovalStore((s) => s.updateStatus)
  const hydrateFromDB = useApprovalStore((s) => s.hydrateFromDB)
  const results = useExecutionStore((s) => s.results)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const [resumingId, setResumingId] = useState<string | null>(null)

  useEffect(() => { hydrateFromDB() }, [hydrateFromDB])

  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  const handleApprove = async (id: string) => {
    setResumingId(id)
    try {
      updateStatus(id, 'approved', 'Approved via workflow builder')
      await resumeWorkflow(id, true)
      toast({ title: 'Approved', description: 'Workflow execution has resumed.' })
    } catch (err) {
      console.error('[OpenWorkflow] Resume failed:', err)
      toast({ title: 'Resume failed', description: 'Could not resume the workflow.', variant: 'destructive' })
    } finally {
      setResumingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setResumingId(id)
    try {
      updateStatus(id, 'rejected', 'Rejected via workflow builder')
      await resumeWorkflow(id, false)
      toast({ title: 'Rejected', description: 'Workflow execution was rejected.' })
    } catch (err) {
      console.error('[OpenWorkflow] Resume failed:', err)
      toast({ title: 'Resume failed', description: 'Could not resume the workflow.', variant: 'destructive' })
    } finally {
      setResumingId(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            Approval Queue
          </h3>
          {pending.length > 0 && (
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {pending.length} pending
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {pending.length === 0 && resolved.length === 0 && (
          <div className="flex flex-col items-center justify-center h-36 text-zinc-600">
            <Clock className="h-8 w-8 mb-2 text-zinc-700" />
            <p className="text-xs font-medium text-zinc-500">No pending approvals</p>
            <p className="text-[11px] text-zinc-600 mt-1">Approval nodes will appear here during execution.</p>
          </div>
        )}

        {pending.map((req) => {
          const context = req.context as Record<string, unknown>
          const isResuming = resumingId === req.id
          return (
            <div key={req.id} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 bg-amber-500/15 border border-amber-500/25 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200">Approval Required</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      Node: <span className="text-zinc-300 font-medium">{context.nodeLabel as string}</span>
                    </p>
                  </div>
                  {isResuming && <Loader2 className="h-4 w-4 animate-spin text-zinc-500 shrink-0" />}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-md border-0 gap-1.5"
                    onClick={() => handleApprove(req.id)}
                    disabled={isResuming || isRunning}
                  >
                    {isResuming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs bg-zinc-700 hover:bg-red-600/80 text-zinc-200 hover:text-white font-medium rounded-md border-0 gap-1.5 transition-colors"
                    onClick={() => handleReject(req.id)}
                    disabled={isResuming || isRunning}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {resolved.map((req) => (
          <div key={req.id} className={`rounded-lg border p-2.5 ${
            req.status === 'approved'
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-red-500/20 bg-red-500/5'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                req.status === 'approved' ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}>
                {req.status === 'approved' ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <X className="h-3 w-3 text-red-400" />
                )}
              </div>
              <span className="text-[11px] text-zinc-400 truncate">
                <span className="text-zinc-300 font-medium">{(req.context as Record<string, unknown>).nodeLabel as string}</span>
                {' — '}
                <span className={req.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}>
                  {req.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
