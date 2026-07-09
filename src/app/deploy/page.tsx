'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Rocket, ArrowRight, RotateCcw, CheckCircle2,
  Clock, AlertCircle, Loader2, GitBranch,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ─── Types ──────────────────────────────────────────

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
  workflowName: string
  environment: string
  environmentId: string
  environmentName: string
  environmentColor: string
  version: number
  snapshotId: string | null
  status: string
  deployedBy: string | null
  deployedAt: string
  promotedFrom: string | null
  notes: string | null
}

// ─── Status Config ──────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string; bg: string }> = {
  deployed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-emerald-400', label: 'Deployed', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  promoting: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: 'text-amber-400', label: 'Promoting', bg: 'bg-amber-500/10 border-amber-500/20' },
  rolled_back: { icon: <RotateCcw className="h-3.5 w-3.5" />, color: 'text-zinc-400', label: 'Rolled Back', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  failed: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-red-400', label: 'Failed', bg: 'bg-red-500/10 border-red-500/20' },
}

// ─── Time Helper ────────────────────────────────────

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Main Page ──────────────────────────────────────

export default function DeploymentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [envRes, deployRes] = await Promise.all([
        fetch('/api/deploy/environments'),
        fetch('/api/deploy'),
      ])
      const envJson = await envRes.json()
      const deployJson = await deployRes.json()
      if (envJson.ok) setEnvironments(envJson.data)
      if (deployJson.ok) setDeployments(deployJson.data)
    } catch (err) {
      console.error('Failed to fetch deployment data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Get latest deployment per environment
  const latestByEnv = new Map<string, DeploymentInfo>()
  for (const d of deployments) {
    const existing = latestByEnv.get(d.environment)
    if (!existing || new Date(d.deployedAt) > new Date(existing.deployedAt)) {
      latestByEnv.set(d.environment, d)
    }
  }

  const handlePromote = useCallback(async (workflowId: string, fromEnv: string, toEnv: string) => {
    setPromoting(toEnv)
    try {
      const res = await fetch('/api/deploy/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, fromEnv, toEnv }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Promoted!', description: `Workflow promoted to ${toEnv}` })
        await fetchData()
      } else {
        toast({ title: 'Promote failed', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Promote failed', variant: 'destructive' })
    } finally {
      setPromoting(null)
    }
  }, [fetchData])

  const handleRollback = useCallback(async (deploymentId: string) => {
    setRollingBack(deploymentId)
    try {
      const res = await fetch(`/api/deploy/${deploymentId}`, {
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
    } catch {
      toast({ title: 'Rollback failed', variant: 'destructive' })
    } finally {
      setRollingBack(null)
    }
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
          <p className="text-sm text-zinc-400">Loading deployments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <GitBranch className="h-3.5 w-3.5 mr-1.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            {/* Environment Pipeline Visual */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-emerald-400" />
                  Deployment Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {environments.map((env, idx) => {
                    const latest = latestByEnv.get(env.slug)
                    const statusCfg = latest ? STATUS_CONFIG[latest.status] : null

                    return (
                      <div key={env.id} className="flex items-center gap-3">
                        <div className="min-w-[200px] p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: env.color }} />
                              <span className="text-sm font-semibold text-zinc-200">{env.name}</span>
                            </div>
                            {env.requiresApproval && (
                              <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">
                                Approval
                              </Badge>
                            )}
                          </div>

                          {latest ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge className={`text-[10px] border ${statusCfg?.bg ?? ''} ${statusCfg?.color ?? 'text-zinc-400'}`}>
                                  {statusCfg?.icon}
                                  <span className="ml-1">{statusCfg?.label ?? latest.status}</span>
                                </Badge>
                                <span className="text-xs font-mono text-zinc-300">v{latest.version}</span>
                              </div>
                              <div className="text-[10px] text-zinc-500">
                                {latest.workflowName}
                              </div>
                              <div className="text-[10px] text-zinc-600">
                                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                                {formatTime(latest.deployedAt)}
                              </div>
                              <div className="flex gap-1.5">
                                {latest.status === 'deployed' && idx < environments.length - 1 && (
                                  <Button
                                    size="sm"
                                    className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                                    onClick={() => handlePromote(latest.workflowId, env.slug, environments[idx + 1].slug)}
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
                                {latest.status === 'deployed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-[10px] px-2 border-zinc-700 text-zinc-400 hover:text-red-300 hover:bg-red-900/20"
                                    onClick={() => handleRollback(latest.id)}
                                    disabled={!!rollingBack}
                                  >
                                    {rollingBack === latest.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-3 w-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-zinc-600 py-2">
                              No active deployment
                            </div>
                          )}
                        </div>

                        {idx < environments.length - 1 && (
                          <div className="flex items-center text-zinc-600 shrink-0">
                            <ArrowRight className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Rocket className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-zinc-500">Environments</span>
                  </div>
                  <p className="text-2xl font-bold text-zinc-100">{environments.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-zinc-500">Active</span>
                  </div>
                  <p className="text-2xl font-bold text-zinc-100">
                    {deployments.filter(d => d.status === 'deployed').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-xs text-zinc-500">Promoting</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">
                    {deployments.filter(d => d.status === 'promoting').length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/80 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <RotateCcw className="h-4 w-4 text-zinc-400" />
                    <span className="text-xs text-zinc-500">Rollbacks</span>
                  </div>
                  <p className="text-2xl font-bold text-zinc-300">
                    {deployments.filter(d => d.status === 'rolled_back').length}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  Deployment History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {deployments.length === 0 ? (
                  <div className="py-16 text-center">
                    <Rocket className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No deployments yet</p>
                    <p className="text-xs text-zinc-600">Deploy a workflow from the builder to see history</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Workflow</TableHead>
                          <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Environment</TableHead>
                          <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Version</TableHead>
                          <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Status</TableHead>
                          <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Deployed</TableHead>
                          <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Promoted From</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deployments.map((d) => {
                          const statusCfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.deployed
                          return (
                            <TableRow key={d.id} className="border-zinc-800/50 hover:bg-zinc-800/30">
                              <TableCell className="py-3">
                                <span className="text-xs text-zinc-200">{d.workflowName}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.environmentColor }} />
                                  <span className="text-xs text-zinc-300">{d.environmentName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-xs font-mono text-zinc-300">v{d.version}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge className={`text-[10px] border ${statusCfg.bg} ${statusCfg.color}`}>
                                  {statusCfg.icon}
                                  <span className="ml-1">{statusCfg.label}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-xs text-zinc-400">{formatTime(d.deployedAt)}</span>
                              </TableCell>
                              <TableCell className="py-3">
                                <span className="text-xs text-zinc-500">{d.promotedFrom ?? '—'}</span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  )
}
