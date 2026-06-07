'use client'

import { useApprovalStore } from '@/stores/approval-store'
import { useExecutionStore } from '@/stores/execution-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Clock, AlertTriangle } from 'lucide-react'

export function ApprovalQueue() {
  const requests = useApprovalStore((s) => s.requests)
  const updateStatus = useApprovalStore((s) => s.updateStatus)
  const results = useExecutionStore((s) => s.results)

  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  const handleApprove = (id: string) => {
    updateStatus(id, 'approved', 'Approved via workflow builder')
  }

  const handleReject = (id: string) => {
    updateStatus(id, 'rejected', 'Rejected via workflow builder')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Approval Queue</h3>
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">{pending.length} pending</Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pending.length === 0 && resolved.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Clock className="h-6 w-6 mb-2 opacity-30" />
            <p className="text-xs">No approval requests yet</p>
            <p className="text-[10px] opacity-60">Run a workflow with a Human node</p>
          </div>
        )}

        {pending.map((req) => {
          const run = results.find((r) => r.runId === req.runId)
          const context = req.context as Record<string, unknown>
          return (
            <div key={req.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-xs font-semibold">Awaiting Approval</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Node: <span className="text-foreground">{context.nodeLabel as string}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Type: <span className="font-mono">{context.nodeType as string}</span>
                  </p>
                  {run && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      Run: {run.runId.slice(0, 16)}...
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="outline" className="h-7 w-7 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleApprove(req.id)}>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-7 w-7 border-red-500/30 hover:bg-red-500/10" onClick={() => handleReject(req.id)}>
                    <X className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {resolved.map((req) => (
          <div key={req.id} className={`rounded-lg border p-2.5 ${
            req.status === 'approved' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
          }`}>
            <div className="flex items-center gap-1.5">
              {req.status === 'approved' ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <X className="h-3 w-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {(req.context as Record<string, unknown>).nodeLabel as string} — {req.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
