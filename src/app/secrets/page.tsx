'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  KeyRound,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Shield,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Secret {
  id: string
  name: string
  key: string
  description?: string | null
  category: string
  isGlobal: boolean
  lastUsedAt?: string | null
  usageCount: number
  expiresAt?: string | null
  tags?: string[] | null
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  { value: 'api_key', label: 'API Key', color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  { value: 'oauth_token', label: 'OAuth Token', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'password', label: 'Password', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'certificate', label: 'Certificate', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'other', label: 'Other', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30' },
]

function getCategoryStyle(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.color ?? 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30'
}
function getCategoryLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat
}

function isExpiringSoon(expiresAt?: string | null) {
  if (!expiresAt) return false
  const days = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return days < 30
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [maskedValues, setMaskedValues] = useState<Record<string, string>>({})
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fetchSecrets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/secrets')
      const json = await res.json() as { ok: boolean; data: Secret[] }
      if (json.ok) setSecrets(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSecrets()
  }, [fetchSecrets])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete secret "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/secrets/${id}`, { method: 'DELETE' })
    const json = await res.json() as { ok: boolean; error?: string }
    if (json.ok) {
      setSecrets((prev) => prev.filter((s) => s.id !== id))
      toast({ title: 'Secret deleted' })
    } else {
      toast({ title: 'Delete failed', description: json.error, variant: 'destructive' })
    }
  }

  const handleReveal = async (id: string) => {
    if (visibleIds.has(id)) {
      setVisibleIds((prev) => { const n = new Set(prev); n.delete(id); return n })
      return
    }
    const res = await fetch(`/api/secrets/${id}`, { method: 'PATCH' })
    const json = await res.json() as { ok: boolean; data?: { masked: string; length: number }; error?: string }
    if (json.ok && json.data) {
      setMaskedValues((prev) => ({ ...prev, [id]: json.data!.masked }))
      setVisibleIds((prev) => new Set([...prev, id]))
    } else {
      toast({ title: 'Reveal failed', description: json.error, variant: 'destructive' })
    }
  }

  const copyToClipboard = (key: string) => {
    void navigator.clipboard.writeText(`{{secret.${key}}}`)
    toast({ title: 'Copied!', description: `{{secret.${key}}} copied to clipboard` })
  }

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  // Group by category
  const grouped = secrets.reduce<Record<string, Secret[]>>((acc, s) => {
    acc[s.category] = acc[s.category] ?? []
    acc[s.category].push(s)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100">Secret Manager</h1>
              <p className="text-[11px] text-zinc-500">{secrets.length} secrets · Use <code className="text-cyan-400 font-mono">{'{{secret.KEY_NAME}}'}</code> in workflows</p>
            </div>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Secret
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-5xl mx-auto px-6 pt-5">
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 flex items-start gap-3">
          <KeyRound className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-cyan-300 font-medium">How to use secrets in workflows</p>
            <p className="text-zinc-400 mt-1">
              Reference any secret as <code className="text-cyan-400 font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-xs">{'{{secret.YOUR_KEY}}'}</code> inside node configuration fields. 
              Secrets are resolved at execution time and never stored in workflow definitions.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {loading ? (
          <div className="text-center py-16 text-zinc-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-30" />
            <p className="text-sm">Loading secrets...</p>
          </div>
        ) : secrets.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="h-7 w-7 text-violet-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">No secrets yet</h2>
            <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
              Store API keys, tokens, and passwords securely. Reference them in any workflow node using the template syntax.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-violet-600 hover:bg-violet-500">
              <Plus className="h-4 w-4" />
              Add Your First Secret
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={`text-[11px] ${getCategoryStyle(category)}`}>
                  {getCategoryLabel(category)}
                </Badge>
                <span className="text-[11px] text-zinc-600">{items.length} secret{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {items.map((secret) => {
                  const expired = isExpired(secret.expiresAt)
                  const expiringSoon = isExpiringSoon(secret.expiresAt)
                  const isExpanded = expandedIds.has(secret.id)
                  const isVisible = visibleIds.has(secret.id)

                  return (
                    <div
                      key={secret.id}
                      className={`rounded-lg border bg-zinc-900/50 transition-colors ${
                        expired ? 'border-red-500/30' : expiringSoon ? 'border-amber-500/30' : 'border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-8 w-8 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                          <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-100">{secret.name}</span>
                            {secret.isGlobal && (
                              <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 px-1">GLOBAL</Badge>
                            )}
                            {expired && (
                              <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400 px-1">EXPIRED</Badge>
                            )}
                            {!expired && expiringSoon && (
                              <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 px-1">EXPIRES SOON</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <code className="text-[11px] text-cyan-400 font-mono">{`{{secret.${secret.key}}}`}</code>
                            <button
                              onClick={() => copyToClipboard(secret.key)}
                              className="text-zinc-600 hover:text-zinc-300 transition-colors"
                              title="Copy variable"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => void handleReveal(secret.id)}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            title={isVisible ? 'Hide value' : 'Reveal value'}
                          >
                            {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => toggleExpand(secret.id)}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => void handleDelete(secret.id, secret.name)}
                            className="h-7 w-7 rounded-md flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Revealed value */}
                      {isVisible && maskedValues[secret.id] && (
                        <div className="px-4 pb-3">
                          <div className="rounded-md bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-xs text-amber-300">
                            {maskedValues[secret.id]}
                          </div>
                        </div>
                      )}

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 border-t border-zinc-800/50 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-zinc-400">
                          {secret.description && (
                            <div className="col-span-2">
                              <span className="text-zinc-600">Description:</span>{' '}
                              <span className="text-zinc-300">{secret.description}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-zinc-600" />
                            <span>Used {secret.usageCount} time{secret.usageCount !== 1 ? 's' : ''}</span>
                          </div>
                          {secret.lastUsedAt && (
                            <div>
                              <span className="text-zinc-600">Last used:</span>{' '}
                              {new Date(secret.lastUsedAt).toLocaleDateString()}
                            </div>
                          )}
                          {secret.expiresAt && (
                            <div className="flex items-center gap-1.5">
                              {expired && <AlertTriangle className="h-3 w-3 text-red-400" />}
                              <span>Expires: {new Date(secret.expiresAt).toLocaleDateString()}</span>
                            </div>
                          )}
                          {secret.tags && secret.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 col-span-2">
                              <Tag className="h-3 w-3 text-zinc-600" />
                              <div className="flex gap-1 flex-wrap">
                                {secret.tags.map((tag) => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">{tag}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="text-zinc-600">Created:</span>{' '}
                            {new Date(secret.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Secret Dialog */}
      <CreateSecretDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          void fetchSecrets()
          setCreateOpen(false)
        }}
      />
    </div>
  )
}

// ─── Create Secret Dialog ─────────────────────────

interface CreateSecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function CreateSecretDialog({ open, onOpenChange, onCreated }: CreateSecretDialogProps) {
  const [form, setForm] = useState({
    name: '',
    key: '',
    value: '',
    description: '',
    category: 'api_key',
    isGlobal: false,
    expiresAt: '',
    tags: '',
  })
  const [showValue, setShowValue] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.key || !form.value) return
    setSaving(true)
    try {
      const res = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          key: form.key,
          value: form.value,
          description: form.description || undefined,
          category: form.category,
          isGlobal: form.isGlobal,
          expiresAt: form.expiresAt || undefined,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        }),
      })
      const json = await res.json() as { ok: boolean; error?: string }
      if (json.ok) {
        toast({ title: 'Secret created', description: `Use {{secret.${form.key}}} in workflows` })
        setForm({ name: '', key: '', value: '', description: '', category: 'api_key', isGlobal: false, expiresAt: '', tags: '' })
        onCreated()
      } else {
        toast({ title: 'Failed to create', description: json.error, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  // Auto-generate key from name
  const handleNameChange = (name: string) => {
    const key = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    setForm((f) => ({ ...f, name, key: f.key || key }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-400" />
            Add Secret
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Stored encrypted. Reference as <code className="text-cyan-400 font-mono text-xs">{'{{secret.KEY}}'}</code> in workflows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Display Name *</label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Stripe API Key"
                className="w-full h-9 bg-zinc-800 border border-zinc-700 rounded-md px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Variable Key *</label>
              <input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))}
                placeholder="STRIPE_API_KEY"
                className="w-full h-9 bg-zinc-800 border border-zinc-700 rounded-md px-3 text-sm text-cyan-400 font-mono placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Secret Value *</label>
            <div className="relative">
              <input
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                type={showValue ? 'text' : 'password'}
                placeholder="sk-..."
                className="w-full h-9 bg-zinc-800 border border-zinc-700 rounded-md px-3 pr-9 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full h-9 bg-zinc-800 border border-zinc-700 rounded-md px-3 text-sm text-zinc-100 outline-none focus:border-violet-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">Expires At (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full h-9 bg-zinc-800 border border-zinc-700 rounded-md px-3 text-sm text-zinc-100 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Stripe production secret key for payment processing"
              className="w-full h-9 bg-zinc-800 border border-zinc-700 rounded-md px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1.5">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="production, payments, stripe"
              className="w-full h-9 bg-zinc-800 border border-zinc-700 rounded-md px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isGlobal"
              checked={form.isGlobal}
              onChange={(e) => setForm((f) => ({ ...f, isGlobal: e.target.checked }))}
              className="rounded accent-violet-500"
            />
            <label htmlFor="isGlobal" className="text-sm text-zinc-300">
              Global secret (available to all workflows in the organization)
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1 h-9 text-zinc-400" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-9 bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => void handleSubmit()}
              disabled={!form.name || !form.key || !form.value || saving}
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Shield className="h-3.5 w-3.5 mr-1.5" />}
              {saving ? 'Saving...' : 'Save Secret'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
