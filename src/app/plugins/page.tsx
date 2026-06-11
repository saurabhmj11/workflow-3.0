'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Plug, Loader2, Plus, CheckCircle2, XCircle,
  Zap, FileText, Globe, Database, Trash2, Settings,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ─── Types ──────────────────────────────────────────

interface PluginInfo {
  id: string
  name: string
  version: string
  description: string
  author: string
  icon?: string
  homepage?: string
  permissions: string[]
  status: 'active' | 'disabled' | 'error'
  installedAt: string
  error?: string
  nodeCount: number
  integrationCount: number
  triggerCount: number
  settings?: Record<string, unknown>
  settingDefinitions?: Array<{
    key: string
    label: string
    type: 'string' | 'number' | 'boolean'
    default?: unknown
    description?: string
  }>
}

// ─── Icon Map ───────────────────────────────────────

const PLUGIN_ICONS: Record<string, React.ElementType> = {
  'pdf-generator': FileText,
  'web-scraper': Globe,
  'data-transformer': Database,
}

const PLUGIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'pdf-generator': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  'web-scraper': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'data-transformer': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
}

// ─── Main Page ──────────────────────────────────────

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [registerForm, setRegisterForm] = useState({ id: '', name: '', version: '1.0.0', description: '', author: '' })
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch('/api/plugins')
      const json = await res.json()
      if (json.ok) {
        setPlugins(json.data.plugins)
        setStatusCounts(json.data.statusCounts)
      }
    } catch (err) {
      console.error('Failed to fetch plugins:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlugins() }, [fetchPlugins])

  const handleToggle = useCallback(async (pluginId: string, currentStatus: string) => {
    setToggling(pluginId)
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active'
      const res = await fetch(`/api/plugins/${pluginId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: `Plugin ${newStatus}`, description: `Plugin has been ${newStatus}` })
        await fetchPlugins()
      } else {
        toast({ title: 'Failed to toggle plugin', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to toggle plugin', variant: 'destructive' })
    } finally {
      setToggling(null)
    }
  }, [fetchPlugins])

  const handleRegister = useCallback(async () => {
    if (!registerForm.id || !registerForm.name) {
      toast({ title: 'ID and name are required', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: registerForm.id,
          name: registerForm.name,
          version: registerForm.version,
          description: registerForm.description || 'A custom OpenWorkflow plugin',
          author: registerForm.author || 'Unknown',
          permissions: [],
          nodes: [],
          integrations: [],
          triggers: [],
          settings: [],
        }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Plugin registered!', description: `${registerForm.name} has been added` })
        setRegisterForm({ id: '', name: '', version: '1.0.0', description: '', author: '' })
        setShowRegisterForm(false)
        await fetchPlugins()
      } else {
        toast({ title: 'Failed to register plugin', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to register plugin', variant: 'destructive' })
    }
  }, [registerForm, fetchPlugins])

  const handleDelete = useCallback(async (pluginId: string) => {
    try {
      const res = await fetch(`/api/plugins/${pluginId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Plugin removed' })
        await fetchPlugins()
      } else {
        toast({ title: 'Failed to remove plugin', description: json.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to remove plugin', variant: 'destructive' })
    }
  }, [fetchPlugins])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm text-zinc-400">Loading plugins...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Plug className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-zinc-500">Total</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{plugins.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">Active</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{statusCounts.active ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-zinc-400" />
                <span className="text-xs text-zinc-500">Disabled</span>
              </div>
              <p className="text-2xl font-bold text-zinc-300">{statusCounts.disabled ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/80 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-zinc-500">Custom Nodes</span>
              </div>
              <p className="text-2xl font-bold text-zinc-100">{plugins.reduce((sum, p) => sum + p.nodeCount, 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Built-in Plugins Showcase */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            Built-in Plugins
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'pdf-generator', name: 'PDF Generator', desc: 'Generate PDFs from workflow data. Supports templates, headers, footers, and custom formatting.', icon: FileText, color: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' } },
              { id: 'web-scraper', name: 'Web Scraper', desc: 'Extract data from web pages using CSS selectors. Supports pagination, rate limiting, and caching.', icon: Globe, color: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' } },
              { id: 'data-transformer', name: 'Data Transformer', desc: 'Transform, filter, and reshape data between workflow steps. Supports JSONPath, mapping, and aggregation.', icon: Database, color: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' } },
            ].map(builtin => {
              const Icon = builtin.icon
              const installed = plugins.find(p => p.id === builtin.id)
              return (
                <Card key={builtin.id} className={`bg-zinc-900/80 border-zinc-800 ${installed ? '' : 'opacity-70'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`h-10 w-10 rounded-lg border ${builtin.color.border} ${builtin.color.bg} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${builtin.color.text}`} />
                      </div>
                      {installed ? (
                        <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                          Installed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                          Available
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-1">{builtin.name}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">{builtin.desc}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* All Plugins */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Plug className="h-4 w-4 text-violet-400" />
              All Registered Plugins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plugins.length === 0 ? (
              <div className="py-12 text-center">
                <Plug className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No plugins registered yet</p>
                <p className="text-xs text-zinc-600">Register a plugin to extend OpenWorkflow</p>
              </div>
            ) : (
              <div className="space-y-3">
                {plugins.map(plugin => {
                  const PluginIcon = PLUGIN_ICONS[plugin.id] ?? Plug
                  const pluginColor = PLUGIN_COLORS[plugin.id] ?? { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' }

                  return (
                    <div
                      key={plugin.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        plugin.status === 'active' ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-800/50 bg-zinc-950/20 opacity-70'
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-lg border ${pluginColor.border} ${pluginColor.bg} flex items-center justify-center shrink-0`}>
                        <PluginIcon className={`h-5 w-5 ${pluginColor.text}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200">{plugin.name}</span>
                          <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500">
                            v{plugin.version}
                          </Badge>
                          {plugin.status === 'error' && (
                            <Badge variant="destructive" className="text-[9px]">Error</Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{plugin.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {plugin.nodeCount > 0 && <span className="text-[10px] text-cyan-400">{plugin.nodeCount} nodes</span>}
                          {plugin.integrationCount > 0 && <span className="text-[10px] text-violet-400">{plugin.integrationCount} integrations</span>}
                          {plugin.triggerCount > 0 && <span className="text-[10px] text-amber-400">{plugin.triggerCount} triggers</span>}
                          <span className="text-[10px] text-zinc-600">by {plugin.author}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <Switch
                          checked={plugin.status === 'active'}
                          onCheckedChange={() => handleToggle(plugin.id, plugin.status)}
                          disabled={!!toggling}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-500 hover:text-red-400"
                          onClick={() => handleDelete(plugin.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Register Dialog */}
        {showRegisterForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-zinc-900 border-zinc-700 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-zinc-100 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-cyan-400" />
                  Register Plugin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Plugin ID</label>
                  <Input
                    value={registerForm.id}
                    onChange={(e) => setRegisterForm({ ...registerForm, id: e.target.value })}
                    placeholder="e.g., my-custom-plugin"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Plugin Name</label>
                  <Input
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    placeholder="e.g., My Custom Plugin"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Version</label>
                  <Input
                    value={registerForm.version}
                    onChange={(e) => setRegisterForm({ ...registerForm, version: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Description</label>
                  <Input
                    value={registerForm.description}
                    onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                    placeholder="What does this plugin do?"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Author</label>
                  <Input
                    value={registerForm.author}
                    onChange={(e) => setRegisterForm({ ...registerForm, author: e.target.value })}
                    placeholder="Your name or organization"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300" onClick={() => setShowRegisterForm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white" onClick={handleRegister}>
                    Register
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  )
}
