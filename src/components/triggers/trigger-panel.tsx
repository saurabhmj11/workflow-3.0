'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Webhook,
  Clock,
  Mail,
  Copy,
  Plus,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// ─── Types ──────────────────────────────────────

interface WebhookTrigger {
  id: string
  workflowId: string
  workflowName: string
  triggerId: string
  webhookUrl: string
  hasSecret: boolean
  description: string | null
  isActive: boolean
  lastTriggeredAt: string | null
  triggerCount: number
}

interface ScheduleTrigger {
  id: string
  workflowId: string
  workflowName: string
  cronExpression: string
  timezone: string
  isActive: boolean
  lastTriggeredAt: string | null
  triggerCount: number
}

interface EmailTrigger {
  id: string
  workflowId: string
  workflowName: string
  host: string
  port: number
  username: string
  hasPassword: boolean
  mailbox: string
  pollInterval: number
  isActive: boolean
  lastTriggeredAt: string | null
  triggerCount: number
}

interface TriggerLog {
  id: string
  triggerType: string
  triggerId: string
  workflowId: string
  status: string
  error: string | null
  duration: number | null
  createdAt: string
}

// ─── Trigger Panel ──────────────────────────────

export function TriggerPanel() {
  const [tab, setTab] = useState<'webhooks' | 'schedules' | 'email' | 'logs'>('webhooks')
  const [webhooks, setWebhooks] = useState<WebhookTrigger[]>([])
  const [schedules, setSchedules] = useState<ScheduleTrigger[]>([])
  const [emailTriggers, setEmailTriggers] = useState<EmailTrigger[]>([])
  const [logs, setLogs] = useState<TriggerLog[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Add trigger dialogs ────────────────────────
  const [showAddWebhook, setShowAddWebhook] = useState(false)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [showAddEmail, setShowAddEmail] = useState(false)

  // Form state
  const [wfId, setWfId] = useState('')
  const [cronExpr, setCronExpr] = useState('')
  const [cronTz, setCronTz] = useState('UTC')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [imapUser, setImapUser] = useState('')
  const [imapPass, setImapPass] = useState('')
  const [imapMailbox, setImapMailbox] = useState('INBOX')
  const [imapPoll, setImapPoll] = useState('30')

  // ─── Fetch data ────────────────────────────────

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/triggers/webhook')
      const json = await res.json()
      if (json.ok) setWebhooks(json.data)
    } catch {}
  }, [])

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/triggers/schedule')
      const json = await res.json()
      if (json.ok) setSchedules(json.data)
    } catch {}
  }, [])

  const fetchEmailTriggers = useCallback(async () => {
    try {
      const res = await fetch('/api/triggers/email')
      const json = await res.json()
      if (json.ok) setEmailTriggers(json.data)
    } catch {}
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/triggers/logs?limit=30')
      const json = await res.json()
      if (json.ok) setLogs(json.data.logs || [])
    } catch {}
  }, [])

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.all([fetchWebhooks(), fetchSchedules(), fetchEmailTriggers(), fetchLogs()]).finally(() => setLoading(false))
  }, [fetchWebhooks, fetchSchedules, fetchEmailTriggers, fetchLogs])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Webhook actions ────────────────────────────

  const createWebhook = async () => {
    if (!wfId) { toast({ title: 'Workflow ID required', variant: 'destructive' }); return }
    try {
      const res = await fetch('/api/triggers/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: wfId, generateSecret: true }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Webhook created', description: 'Copy the URL and secret before closing' })
        setShowAddWebhook(false)
        setWfId('')
        fetchWebhooks()
      } else {
        toast({ title: 'Failed', description: json.error, variant: 'destructive' })
      }
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const deleteWebhook = async (id: string) => {
    try {
      await fetch(`/api/triggers/webhook?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Webhook deleted' })
      fetchWebhooks()
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  // ─── Schedule actions ───────────────────────────

  const createSchedule = async () => {
    if (!wfId || !cronExpr) { toast({ title: 'Workflow ID and cron expression required', variant: 'destructive' }); return }
    try {
      const res = await fetch('/api/triggers/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: wfId, cronExpression: cronExpr, timezone: cronTz }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Schedule created' })
        setShowAddSchedule(false)
        setWfId('')
        setCronExpr('')
        fetchSchedules()
      } else {
        toast({ title: 'Failed', description: json.error, variant: 'destructive' })
      }
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const toggleSchedule = async (id: string, isActive: boolean) => {
    try {
      await fetch('/api/triggers/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      })
      toast({ title: isActive ? 'Schedule paused' : 'Schedule resumed' })
      fetchSchedules()
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const deleteSchedule = async (id: string) => {
    try {
      await fetch(`/api/triggers/schedule?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Schedule deleted' })
      fetchSchedules()
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  // ─── Email trigger actions ──────────────────────

  const createEmailTrigger = async () => {
    if (!wfId || !imapHost || !imapUser || !imapPass) {
      toast({ title: 'Workflow ID, host, username, and password required', variant: 'destructive' }); return
    }
    try {
      const res = await fetch('/api/triggers/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: wfId,
          host: imapHost,
          port: parseInt(imapPort),
          username: imapUser,
          password: imapPass,
          mailbox: imapMailbox,
          pollInterval: parseInt(imapPoll),
        }),
      })
      const json = await res.json()
      if (json.ok) {
        toast({ title: 'Email trigger created' })
        setShowAddEmail(false)
        setWfId(''); setImapHost(''); setImapUser(''); setImapPass('')
        fetchEmailTriggers()
      } else {
        toast({ title: 'Failed', description: json.error, variant: 'destructive' })
      }
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const deleteEmailTrigger = async (id: string) => {
    try {
      await fetch(`/api/triggers/email?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Email trigger deleted' })
      fetchEmailTriggers()
    } catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  // ─── Render helpers ────────────────────────────

  const timeAgo = (iso: string | null) => {
    if (!iso) return 'Never'
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const cronToHuman = (expr: string) => {
    const common: Record<string, string> = {
      '* * * * *': 'Every minute',
      '*/5 * * * *': 'Every 5 minutes',
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 * * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 9 * * *': 'Daily at 9 AM',
      '0 9 * * 1': 'Weekly on Monday at 9 AM',
      '0 0 1 * *': 'Monthly on 1st',
    }
    return common[expr] || expr
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-200">Triggers</span>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 hover:text-zinc-300" onClick={fetchAll}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 shrink-0">
        {(['webhooks', 'schedules', 'email', 'logs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-1 py-1.5 text-[10px] font-medium transition-colors ${
              tab === t
                ? t === 'webhooks' ? 'text-blue-400 border-b-2 border-blue-400'
                  : t === 'schedules' ? 'text-amber-400 border-b-2 border-amber-400'
                  : t === 'email' ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-zinc-300 border-b-2 border-zinc-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'webhooks' ? 'Webhooks' : t === 'schedules' ? 'Schedules' : t === 'email' ? 'Email' : 'Logs'}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500 text-xs">Loading...</div>
          ) : tab === 'webhooks' ? (
            <>
              <Button size="sm" className="w-full h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-500" onClick={() => setShowAddWebhook(true)}>
                <Plus className="h-3 w-3" /> Add Webhook
              </Button>
              {showAddWebhook && (
                <div className="p-2 rounded-md bg-zinc-800/50 border border-zinc-700 space-y-2">
                  <Input placeholder="Workflow ID" value={wfId} onChange={(e) => setWfId(e.target.value)} className="h-7 text-xs" />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-[10px] flex-1 bg-blue-600 hover:bg-blue-500" onClick={createWebhook}>Create</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowAddWebhook(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {webhooks.length === 0 ? (
                <p className="text-center text-zinc-500 text-xs py-4">No webhooks configured</p>
              ) : webhooks.map((wh) => (
                <div key={wh.id} className="p-2 rounded-md bg-zinc-800/50 border border-zinc-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Webhook className="h-3 w-3 text-blue-400" />
                      <span className="text-[10px] font-medium text-zinc-200 truncate max-w-[120px]">{wh.workflowName}</span>
                    </div>
                    <Badge variant="outline" className={`text-[8px] h-4 ${wh.isActive ? 'border-emerald-500/30 text-emerald-400' : 'border-zinc-600 text-zinc-500'}`}>
                      {wh.isActive ? 'ACTIVE' : 'PAUSED'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <code className="text-[8px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded flex-1 truncate">{wh.webhookUrl}</code>
                    <Button size="icon" variant="ghost" className="h-4 w-4 shrink-0" onClick={() => copyToClipboard(wh.webhookUrl)}>
                      <Copy className="h-2.5 w-2.5 text-zinc-400" />
                    </Button>
                  </div>
                  {wh.hasSecret && (
                    <Badge variant="outline" className="text-[8px] h-4 border-amber-500/30 text-amber-400">
                      <Lock className="h-2 w-2 mr-0.5" /> HMAC Secret
                    </Badge>
                  )}
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>{wh.triggerCount} calls · {timeAgo(wh.lastTriggeredAt)}</span>
                    <Button size="icon" variant="ghost" className="h-4 w-4 text-red-400 hover:text-red-300" onClick={() => deleteWebhook(wh.id)}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          ) : tab === 'schedules' ? (
            <>
              <Button size="sm" className="w-full h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-500" onClick={() => setShowAddSchedule(true)}>
                <Plus className="h-3 w-3" /> Add Schedule
              </Button>
              {showAddSchedule && (
                <div className="p-2 rounded-md bg-zinc-800/50 border border-zinc-700 space-y-2">
                  <Input placeholder="Workflow ID" value={wfId} onChange={(e) => setWfId(e.target.value)} className="h-7 text-xs" />
                  <Input placeholder="Cron (e.g. */5 * * * *)" value={cronExpr} onChange={(e) => setCronExpr(e.target.value)} className="h-7 text-xs" />
                  <Input placeholder="Timezone (default: UTC)" value={cronTz} onChange={(e) => setCronTz(e.target.value)} className="h-7 text-xs" />
                  <div className="text-[9px] text-zinc-500">
                    Common: */5 * * * * (5min) · 0 * * * * (hourly) · 0 9 * * * (daily 9AM)
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-[10px] flex-1 bg-amber-600 hover:bg-amber-500" onClick={createSchedule}>Create</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowAddSchedule(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {schedules.length === 0 ? (
                <p className="text-center text-zinc-500 text-xs py-4">No schedules configured</p>
              ) : schedules.map((sc) => (
                <div key={sc.id} className="p-2 rounded-md bg-zinc-800/50 border border-zinc-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] font-medium text-zinc-200 truncate max-w-[120px]">{sc.workflowName}</span>
                    </div>
                    <Badge variant="outline" className={`text-[8px] h-4 ${sc.isActive ? 'border-emerald-500/30 text-emerald-400' : 'border-zinc-600 text-zinc-500'}`}>
                      {sc.isActive ? 'ACTIVE' : 'PAUSED'}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-zinc-300">{cronToHuman(sc.cronExpression)}</div>
                  <div className="text-[9px] text-zinc-500 font-mono">{sc.cronExpression} · {sc.timezone}</div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>{sc.triggerCount} runs · {timeAgo(sc.lastTriggeredAt)}</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-4 w-4" onClick={() => toggleSchedule(sc.id, sc.isActive)}>
                        {sc.isActive ? <Pause className="h-2.5 w-2.5 text-amber-400" /> : <Play className="h-2.5 w-2.5 text-emerald-400" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-4 w-4 text-red-400 hover:text-red-300" onClick={() => deleteSchedule(sc.id)}>
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : tab === 'email' ? (
            <>
              <Button size="sm" className="w-full h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-500" onClick={() => setShowAddEmail(true)}>
                <Plus className="h-3 w-3" /> Add Email Trigger
              </Button>
              {showAddEmail && (
                <div className="p-2 rounded-md bg-zinc-800/50 border border-zinc-700 space-y-2">
                  <Input placeholder="Workflow ID" value={wfId} onChange={(e) => setWfId(e.target.value)} className="h-7 text-xs" />
                  <Input placeholder="IMAP Host (e.g. imap.gmail.com)" value={imapHost} onChange={(e) => setImapHost(e.target.value)} className="h-7 text-xs" />
                  <div className="flex gap-1">
                    <Input placeholder="Port" value={imapPort} onChange={(e) => setImapPort(e.target.value)} className="h-7 text-xs w-16" />
                    <Input placeholder="Email" value={imapUser} onChange={(e) => setImapUser(e.target.value)} className="h-7 text-xs flex-1" />
                  </div>
                  <Input type="password" placeholder="App Password" value={imapPass} onChange={(e) => setImapPass(e.target.value)} className="h-7 text-xs" />
                  <div className="flex gap-1">
                    <Input placeholder="Mailbox" value={imapMailbox} onChange={(e) => setImapMailbox(e.target.value)} className="h-7 text-xs flex-1" />
                    <Input placeholder="Poll (s)" value={imapPoll} onChange={(e) => setImapPoll(e.target.value)} className="h-7 text-xs w-16" />
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-[10px] flex-1 bg-emerald-600 hover:bg-emerald-500" onClick={createEmailTrigger}>Create</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setShowAddEmail(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {emailTriggers.length === 0 ? (
                <p className="text-center text-zinc-500 text-xs py-4">No email triggers configured</p>
              ) : emailTriggers.map((et) => (
                <div key={et.id} className="p-2 rounded-md bg-zinc-800/50 border border-zinc-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] font-medium text-zinc-200 truncate max-w-[120px]">{et.workflowName}</span>
                    </div>
                    <Badge variant="outline" className={`text-[8px] h-4 ${et.isActive ? 'border-emerald-500/30 text-emerald-400' : 'border-zinc-600 text-zinc-500'}`}>
                      {et.isActive ? 'ACTIVE' : 'PAUSED'}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-zinc-300">{et.username}</div>
                  <div className="text-[9px] text-zinc-500">{et.host}:{et.port} · {et.mailbox} · poll {et.pollInterval}s</div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>{et.triggerCount} emails · {timeAgo(et.lastTriggeredAt)}</span>
                    <Button size="icon" variant="ghost" className="h-4 w-4 text-red-400 hover:text-red-300" onClick={() => deleteEmailTrigger(et.id)}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {logs.length === 0 ? (
                <p className="text-center text-zinc-500 text-xs py-4">No trigger logs yet</p>
              ) : logs.map((log) => (
                <div key={log.id} className="p-2 rounded-md bg-zinc-800/50 border border-zinc-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {log.status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-400" />
                      )}
                      <Badge variant="outline" className="text-[8px] h-4 border-zinc-600 text-zinc-400">
                        {log.triggerType}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-zinc-500">{timeAgo(log.createdAt)}</span>
                  </div>
                  <div className="text-[9px] text-zinc-400 font-mono truncate">{log.triggerId}</div>
                  {log.error && (
                    <div className="text-[9px] text-red-400 flex items-start gap-1">
                      <AlertCircle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                      <span className="truncate">{log.error}</span>
                    </div>
                  )}
                  {log.duration !== null && (
                    <div className="text-[9px] text-zinc-500">{log.duration}ms</div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Tiny lock icon for HMAC badge
function Lock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
