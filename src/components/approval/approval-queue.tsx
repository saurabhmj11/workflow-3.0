'use client'

import { useApprovalStore } from '@/stores/approval-store'
import { useExecutionStore } from '@/stores/execution-store'
import { resumeWorkflow } from '@/lib/engine'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Clock, Loader2, Star, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from '@/hooks/use-toast'

export function ApprovalQueue() {
  const requests = useApprovalStore((s) => s.requests)
  const updateStatus = useApprovalStore((s) => s.updateStatus)
  const hydrateFromDB = useApprovalStore((s) => s.hydrateFromDB)
  const results = useExecutionStore((s) => s.results)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const [resumingId, setResumingId] = useState<string | null>(null)

  // Hydrate pending approvals from DB on mount
  useEffect(() => { hydrateFromDB() }, [hydrateFromDB])

  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  const handleApprove = async (id: string) => {
    setResumingId(id)
    try {
      updateStatus(id, 'approved', 'Approved via workflow builder')
      await resumeWorkflow(id, true)
      toast({ title: 'YAY!', description: 'You said YES! Robot continues!' })
    } catch (err) {
      console.error('[OpenWorkflow] Resume failed:', err)
      toast({ title: 'Oh no!', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setResumingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setResumingId(id)
    try {
      updateStatus(id, 'rejected', 'Rejected via workflow builder')
      await resumeWorkflow(id, false)
      toast({ title: 'Okay!', description: 'You said NO. Robot goes another way.' })
    } catch (err) {
      console.error('[OpenWorkflow] Resume failed:', err)
      toast({ title: 'Oh no!', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setResumingId(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-blue-100 bg-blue-50/50 rounded-t-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-blue-500 flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
            Your Choices!
          </h3>
          {pending.length > 0 && (
            <Badge className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-3 py-1 rounded-full text-sm">
              {pending.length} Waiting!
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pending.length === 0 && resolved.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-blue-400 bg-blue-50 rounded-xl border border-dashed border-blue-200">
            <Clock className="h-12 w-12 mb-3 text-blue-300" />
            <p className="text-lg font-bold">Nothing to decide yet!</p>
            <p className="text-sm font-medium mt-1">Run a robot that needs your help</p>
          </div>
        )}

        {pending.map((req) => {
          const run = results.find((r) => r.runId === req.runId)
          const context = req.context as Record<string, unknown>
          const isResuming = resumingId === req.id
          return (
            <div key={req.id} className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-orange-400 text-white rounded-lg flex items-center justify-center font-bold text-xl shadow-inner">
                    ?
                  </div>
                  <div>
                    <span className="text-lg font-bold text-orange-600">Robot Needs You!</span>
                    <p className="text-sm text-orange-500 font-medium">
                      Block: <span className="text-orange-700 font-bold">{context.nodeLabel as string}</span>
                    </p>
                  </div>
                  {isResuming && <Loader2 className="h-6 w-6 animate-spin text-orange-400 ml-auto" />}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    size="lg"
                    className="flex-1 h-14 rounded-lg bg-green-400 hover:bg-green-500 text-white font-bold text-lg border-b border-green-600 hover:border-b-0 hover:translate-y-1 transition-all"
                    onClick={() => handleApprove(req.id)}
                    disabled={isResuming || isRunning}
                  >
                    {isResuming ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                      <>
                        <ThumbsUp className="h-6 w-6 mr-2" />
                        YES!
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-14 rounded-lg bg-red-400 hover:bg-red-500 text-white font-bold text-lg border-b border-red-600 hover:border-b-0 hover:translate-y-1 transition-all"
                    onClick={() => handleReject(req.id)}
                    disabled={isResuming || isRunning}
                  >
                    <ThumbsDown className="h-6 w-6 mr-2" />
                    NO
                  </Button>
                </div>
              </div>
            </div>
          )
        })}

        {resolved.map((req) => (
          <div key={req.id} className={`rounded-xl border p-3 shadow-sm ${
            req.status === 'approved' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-inner ${
                req.status === 'approved' ? 'bg-green-400 text-white' : 'bg-red-400 text-white'
              }`}>
                {req.status === 'approved' ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <X className="h-6 w-6" />
                )}
              </div>
              <span className={`text-base font-bold ${
                req.status === 'approved' ? 'text-green-600' : 'text-red-600'
              }`}>
                {(req.context as Record<string, unknown>).nodeLabel as string} — {req.status === 'approved' ? 'You said YES!' : 'You said NO'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
