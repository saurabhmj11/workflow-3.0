'use client'

// ─── Deployment Panel ─────────────────────────────
// Shows deployment environments and allows promoting workflows
// between environments with version tracking and rollback

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Rocket,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useWorkflowStore } from '@/stores/workflow-store'

// ─── Types ─────────────────────────────────────────

interface Environment {
  id: string
  name: string
  slug: string
  description?: string
  color: string
  isDefault: boolean
  requiresApproval: boolean
}

interface DeploymentInfo {
  id: string
  workflowId: string
  environment: string
  environmentId: string
  version: number
  snapshotId: string | null
  status: string
  deployedBy: string | null
  deployedAt: string
  promotedFrom: string | null
  notes: string | null
}

interface HistoryDeployment {
  id: string
  workflowId: string
  workflowName: string
  environment: string
  environmentName: string
  environmentColor: string
  version: number
  status: string
  deployedAt: string
  notes: string | null
}

// ─── Status Config ─────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  deployed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-emerald-400', label: 'Deployed' },
  promoting: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: 'text-amber-400', label: 'Promoting' },
  rolled_back: { icon: <RotateCcw className="h-3.5 w-3.5" />, color: 'text-zinc-400', label: 'Rolled Back' },
  failed: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-red-400', label: 'Failed' },
}

// ─── Deployment Panel Component ────────────────────

export function DeploymentPanel() {
  const workflowId = useWorkflowStore((s) => s.workflowId)
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [activeDeployments, setActiveDeployments] = useState<Record<string, DeploymentInfo>>({})
  const [history, setHistory] = useState<HistoryDeployment[]>([])
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState<string | null>(null)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // ─── Fetch Data ────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const envRes = await fetch('/api/deployments/environments')
      const envJson = await envRes.json()
      if (envJson.ok) {
        setEnvironments(envJson.data)
      }

      if (workflowId) {
        const activeRes = await fetch(`/api/deployments?workflowId=${workflowId}&active=true`)
        const activeJson = await activeRes.json()
        if (activeJson.ok) {
          setActiveDeployments(activeJson.data)
        }

        const histRes = await fetch(`/api/deployments?workflowId=${workflowId}`)
        const histJson = await histRes.json()
        if (histJson.ok) {
          setHistory(histJson.data.slice(0, 20))
        }
      }
    } catch (err) {
      console.error('Failed to fetch deployment data:', err)
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Deploy to Environment ─────────────────────
  const handleDeploy = useCallback(async (envSlug: string) => {
    if (!workflowId) {
      toast({ title: 'No workflow', description: 'Save the workflow first before deploying', variant: 'destructive' })
      return
    }

    setDeploying(envSlug)
    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, environment: envSlug }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Deployed!', description: `Workflow deployed to ${envSlug} (v${json.data.version})` })
        await fetchData()
      } else {
        toast({ title: 'Deploy failed', description: json.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Deploy failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setDeploying(null)
    }
  }, [workflowId, fetchData])

  // ─── Promote Between Environments ──────────────
  const handlePromote = useCallback(async (fromEnv: string, toEnv: string) => {
    if (!workflowId) return

    setPromoting(toEnv)
    try {
      const res = await fetch('/api/deployments/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, fromEnv, toEnv }),
      })
      const json = await res.json()
      if (json.ok) {
        const statusText = json.data.status === 'promoting' ? ' (awaiting approval)' : ''
        toast({ title: 'Promoted!', description: `Workflow promoted to ${toEnv}${statusText}` })
        await fetchData()
      } else {
        toast({ title: 'Promote failed', description: json.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Promote failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setPromoting(null)
    }
  }, [workflowId, fetchData])

  // ─── Rollback Deployment ───────────────────────
  const handleRollback = useCallback(async (deploymentId: string) => {
    setRollingBack(deploymentId)
    try {
      const res = await fetch(`/api/deployments/${deploymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback' }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Rolled back!', description: `Deployment rolled back to v${json.data.version}` })
        await fetchData()
      } else {
        toast({ title: 'Rollback failed', description: json.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Rollback failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setRollingBack(null)
    }
  }, [fetchData])

  // ─── Render ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading deployments...
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Environment Pipeline */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              <Rocket className="h-3 w-3" />
              Environments
            </div>

            {environments.length === 0 ? (
              <p className="text-xs text-zinc-500">No environments configured</p>
            ) : (
              <div className="space-y-1.5">
                {environments.map((env, idx) => {
                  const active = activeDeployments[env.slug]
                  const statusConfig = active ? STATUS_CONFIG[active.status] : null

                  return (
                    <div key={env.id}>
                      <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardContent className="p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: env.color }}
                              />
                              <span className="text-xs font-medium text-zinc-200">{env.name}</span>
                              {env.requiresApproval && (
                                <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-500/30 text-amber-400">
                                  Approval
                                </Badge>
                              )}
                            </div>
                            {active ? (
                              <div className={`flex items-center gap-1 text-[10px] ${statusConfig?.color ?? 'text-zinc-400'}`}>
                                {statusConfig?.icon}
                                v{active.version}
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-600">Not deployed</span>
                            )}
                          </div>

                          {active && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] text-zinc-500">
                                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                                {new Date(active.deployedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2 flex-1 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                              onClick={() => handleDeploy(env.slug)}
                              disabled={!!deploying}
                            >
                              {deploying === env.slug ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Rocket className="h-3 w-3 mr-1" />
                              )}
                              Deploy
                            </Button>

                            {active && idx < environments.length - 1 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 flex-1 border-cyan-800/50 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-900/30"
                                onClick={() => handlePromote(env.slug, environments[idx + 1].slug)}
                                disabled={!!promoting}
                              >
                                {promoting === environments[idx + 1].slug ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                )}
                                Promote
                              </Button>
                            )}

                            {active && active.status === 'deployed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2 border-zinc-700 text-zinc-400 hover:text-red-300 hover:bg-red-900/20 hover:border-red-800/50"
                                onClick={() => handleRollback(active.id)}
                                disabled={!!rollingBack}
                              >
                                {rollingBack === active.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Arrow between environments */}
                      {idx < environments.length - 1 && (
                        <div className="flex justify-center py-0.5">
                          <ArrowRight className="h-3 w-3 text-zinc-600 rotate-90" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Separator className="bg-zinc-800" />

          {/* No Workflow Warning */}
          {!workflowId && (
            <div className="text-center py-4">
              <GitBranch className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Save a workflow first to enable deployments</p>
            </div>
          )}

          {/* Deployment History */}
          {workflowId && history.length > 0 && (
            <div className="space-y-2">
              <button
                className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider w-full hover:text-zinc-300 transition-colors"
                onClick={() => setShowHistory(!showHistory)}
              >
                <Clock className="h-3 w-3" />
                History
                {showHistory ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
              </button>

              {showHistory && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {history.map((d) => {
                    const histStatus = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.deployed
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-900/30 border border-zinc-800/50"
                      >
                        <div
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: d.environmentColor }}
                        />
                        <span className="text-[10px] text-zinc-400 truncate flex-1">
                          {d.environmentName} · v{d.version}
                        </span>
                        <span className={`text-[10px] flex items-center gap-0.5 ${histStatus.color}`}>
                          {histStatus.icon}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
