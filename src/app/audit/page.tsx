'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Workflow,
  Play,
  UserCheck,
  ShieldCheck,
  Zap,
  Plug,
  Key,
  UserPlus,
  LogIn,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'


// ─── Types ─────────────────────────────────────────
interface AuditLogEntry {
  id: string
  userId: string | null
  userEmail: string | null
  action: string
  resource: string
  resourceId: string | null
  resourceName: string | null
  status: string
  ipAddress: string | null
  userAgent: string | null
  details: Record<string, unknown> | null
  createdAt: string
}

interface AuditLogResponse {
  logs: AuditLogEntry[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// ─── Action Config ────────────────────────────────
const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  'workflow.created': { label: 'Created', icon: Workflow, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  'workflow.updated': { label: 'Updated', icon: Workflow, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  'workflow.deleted': { label: 'Deleted', icon: Trash2, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
  'workflow.executed': { label: 'Executed', icon: Play, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20' },
  'approval.approved': { label: 'Approved', icon: UserCheck, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  'approval.rejected': { label: 'Rejected', icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
  'integration.connected': { label: 'Connected', icon: Plug, color: 'text-violet-400', bgColor: 'bg-violet-500/10 border-violet-500/20' },
  'integration.disconnected': { label: 'Disconnected', icon: Plug, color: 'text-zinc-400', bgColor: 'bg-zinc-500/10 border-zinc-500/20' },
  'trigger.created': { label: 'Trigger Created', icon: Zap, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  'trigger.deleted': { label: 'Trigger Deleted', icon: Trash2, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
  'user.login': { label: 'Login', icon: LogIn, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  'user.registered': { label: 'Registered', icon: UserPlus, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  'api_key.created': { label: 'Key Created', icon: Key, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  'api_key.revoked': { label: 'Key Revoked', icon: ShieldCheck, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
}

const RESOURCE_OPTIONS = [
  { value: '', label: 'All Resources' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'execution', label: 'Execution' },
  { value: 'approval', label: 'Approval' },
  { value: 'integration', label: 'Integration' },
  { value: 'trigger', label: 'Trigger' },
  { value: 'user', label: 'User' },
  { value: 'api_key', label: 'API Key' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'workflow.created', label: 'Workflow Created' },
  { value: 'workflow.updated', label: 'Workflow Updated' },
  { value: 'workflow.deleted', label: 'Workflow Deleted' },
  { value: 'workflow.executed', label: 'Workflow Executed' },
  { value: 'approval.approved', label: 'Approval Approved' },
  { value: 'approval.rejected', label: 'Approval Rejected' },
  { value: 'integration.connected', label: 'Integration Connected' },
  { value: 'integration.disconnected', label: 'Integration Disconnected' },
  { value: 'trigger.created', label: 'Trigger Created' },
  { value: 'trigger.deleted', label: 'Trigger Deleted' },
  { value: 'user.registered', label: 'User Registered' },
  { value: 'user.login', label: 'User Login' },
  { value: 'api_key.created', label: 'API Key Created' },
  { value: 'api_key.revoked', label: 'API Key Revoked' },
]

const PAGE_SIZE = 50

// ─── Time Formatter ───────────────────────────────
function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFullTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── JSON Detail Viewer ──────────────────────────
function DetailViewer({ details }: { details: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(false)

  if (!details || Object.keys(details).length === 0) return null

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'Hide details' : 'Show details'}
      </button>
      {expanded && (
        <pre className="mt-1 p-2 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 overflow-x-auto max-w-sm font-mono">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ─── Main Audit Page ─────────────────────────────
export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [resourceFilter, setResourceFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(offset))
      if (resourceFilter) params.set('resource', resourceFilter)
      if (actionFilter) params.set('action', actionFilter)

      const res = await fetch(`/api/audit?${params.toString()}`)
      const json = await res.json()
      if (json.ok) {
        setLogs(json.data.logs)
        setTotal(json.data.total)
      }
    } catch (err) {
      console.error('[AuditPage] Failed to fetch logs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [offset, resourceFilter, actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset offset when filters change
  const handleResourceChange = (val: string) => {
    setResourceFilter(val)
    setOffset(0)
  }

  const handleActionChange = (val: string) => {
    setActionFilter(val)
    setOffset(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Filters */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Resource</span>
                <Select value={resourceFilter} onValueChange={handleResourceChange}>
                  <SelectTrigger className="h-8 w-[150px] bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue placeholder="All Resources" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {RESOURCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Action</span>
                <Select value={actionFilter} onValueChange={handleActionChange}>
                  <SelectTrigger className="h-8 w-[180px] bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(resourceFilter || actionFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-zinc-400 hover:text-zinc-200"
                  onClick={() => {
                    setResourceFilter('')
                    setActionFilter('')
                    setOffset(0)
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Table */}
        <Card className="bg-zinc-900/80 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Event Log
              {isLoading && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && logs.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                <p className="text-sm text-zinc-400">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <Search className="h-8 w-8 text-zinc-600" />
                <p className="text-sm text-zinc-400">No audit logs found</p>
                <p className="text-xs text-zinc-600">
                  {resourceFilter || actionFilter
                    ? 'Try adjusting your filters'
                    : 'Audit logs will appear here as actions are performed'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Time</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">User</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Action</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Resource</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Status</TableHead>
                      <TableHead className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const actionCfg = ACTION_CONFIG[log.action] || {
                        label: log.action,
                        icon: Activity,
                        color: 'text-zinc-400',
                        bgColor: 'bg-zinc-500/10 border-zinc-500/20',
                      }
                      const ActionIcon = actionCfg.icon
                      const isExpanded = expandedId === log.id

                      return (
                        <TableRow
                          key={log.id}
                          className="border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        >
                          <TableCell className="py-3">
                            <div>
                              <p className="text-xs text-zinc-300 font-mono">{formatTime(log.createdAt)}</p>
                              {isExpanded && (
                                <p className="text-[10px] text-zinc-600">{formatFullTime(log.createdAt)}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div>
                              <p className="text-xs text-zinc-300 truncate max-w-[150px]">
                                {log.userEmail || log.userId?.slice(0, 8) || 'System'}
                              </p>
                              {isExpanded && log.ipAddress && (
                                <p className="text-[10px] text-zinc-600 font-mono">{log.ipAddress}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className={`h-6 w-6 rounded border flex items-center justify-center ${actionCfg.bgColor}`}>
                                <ActionIcon className={`h-3 w-3 ${actionCfg.color}`} />
                              </div>
                              <span className={`text-xs font-medium ${actionCfg.color}`}>
                                {actionCfg.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div>
                              <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 capitalize">
                                {log.resource}
                              </Badge>
                              {log.resourceName && (
                                <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[150px]">{log.resourceName}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            {log.status === 'success' ? (
                              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                <XCircle className="h-2.5 w-2.5 mr-1" />
                                Failure
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <DetailViewer details={log.details} />
                            {isExpanded && log.userAgent && (
                              <p className="text-[10px] text-zinc-600 mt-1 truncate max-w-[250px]" title={log.userAgent}>
                                {log.userAgent.slice(0, 50)}...
                              </p>
                            )}
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

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} events
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-zinc-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
  )
}
