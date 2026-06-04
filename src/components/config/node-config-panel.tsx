'use client'

import { useCallback, useMemo } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { getCategoryForType, type NodeType } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  Trash2,
  Zap, Webhook, Clock, Mail, Phone, MessageSquare,
  GitBranch, GitMerge, Repeat, RotateCcw, Timer,
  Brain, Bot, BookOpen, Tags, FileText,
  UserCheck, Eye, AlertTriangle,
  Database, Send, Hash, MessageCircle, Plug,
  Plus,
  type LucideIcon,
} from 'lucide-react'

// ─── Icon map (mirrors agent-node.tsx) ──────────
const TRIGGER_ICONS: Record<string, LucideIcon> = {
  api: Zap, webhook: Webhook, schedule: Clock, email: Mail, 'voice-call': Phone, whatsapp: MessageSquare,
}
const LOGIC_ICONS: Record<string, LucideIcon> = {
  condition: GitBranch, switch: GitMerge, loop: Repeat, retry: RotateCcw, delay: Timer,
}
const AI_ICONS: Record<string, LucideIcon> = {
  llm: Brain, agent: Bot, rag: BookOpen, classifier: Tags, summarizer: FileText,
}
const HUMAN_ICONS: Record<string, LucideIcon> = {
  approval: UserCheck, review: Eye, escalation: AlertTriangle,
}
const ACTION_ICONS: Record<string, LucideIcon> = {
  crm: Database, email: Send, slack: Hash, whatsapp: MessageCircle, database: Plug,
}
const ALL_ICONS: Record<string, Record<string, LucideIcon>> = {
  trigger: TRIGGER_ICONS, logic: LOGIC_ICONS, ai: AI_ICONS, human: HUMAN_ICONS, action: ACTION_ICONS,
}

// ─── Config Schema ──────────────────────────────
type FieldType = 'text' | 'select' | 'textarea' | 'number' | 'switch' | 'array-string' | 'array-object'

interface ConfigFieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: { value: string; label: string }[]
  /** For array-object, define the sub-fields */
  subFields?: { key: string; label: string; type: 'text' | 'textarea' | 'select'; placeholder?: string; options?: { value: string; label: string }[] }[]
}

const CONFIG_SCHEMA: Record<string, ConfigFieldDef[]> = {
  // ── Triggers ──
  api: [
    { key: 'method', label: 'Method', type: 'select', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' }, { value: 'DELETE', label: 'DELETE' }, { value: 'PATCH', label: 'PATCH' }] },
    { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: '/api/webhook' },
    { key: 'path', label: 'Path', type: 'text', placeholder: '/data' },
  ],
  webhook: [
    { key: 'url', label: 'URL', type: 'text', placeholder: 'https://...' },
    { key: 'secret', label: 'Secret', type: 'text', placeholder: 'whsec_...' },
  ],
  schedule: [
    { key: 'cron', label: 'Cron Expression', type: 'text', placeholder: '0 * * * *' },
    { key: 'timezone', label: 'Timezone', type: 'select', options: [
      { value: 'UTC', label: 'UTC' }, { value: 'America/New_York', label: 'EST (New York)' },
      { value: 'America/Los_Angeles', label: 'PST (Los Angeles)' }, { value: 'Europe/London', label: 'GMT (London)' },
      { value: 'Asia/Tokyo', label: 'JST (Tokyo)' }, { value: 'Asia/Shanghai', label: 'CST (Shanghai)' },
    ] },
  ],
  email: [
    { key: 'imapServer', label: 'IMAP Server', type: 'text', placeholder: 'imap.gmail.com' },
    { key: 'folder', label: 'Folder', type: 'text', placeholder: 'INBOX' },
  ],
  'voice-call': [
    { key: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '+1-555-0142' },
    { key: 'greeting', label: 'Greeting', type: 'textarea', placeholder: 'Hello, how can I help?' },
  ],
  whatsapp: [
    { key: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '+1-555-0142' },
    { key: 'template', label: 'Template', type: 'text', placeholder: 'hello_template' },
  ],

  // ── Logic ──
  condition: [
    { key: 'expression', label: 'Expression', type: 'textarea', placeholder: 'data.status === "active"' },
    { key: 'leftOperand', label: 'Left Operand', type: 'text', placeholder: 'data.value' },
    { key: 'operator', label: 'Operator', type: 'select', options: [
      { value: '==', label: '==' }, { value: '!=', label: '!=' }, { value: '>', label: '>' },
      { value: '<', label: '<' }, { value: '>=', label: '>=' }, { value: '<=', label: '<=' },
      { value: 'contains', label: 'contains' }, { value: 'startsWith', label: 'startsWith' },
    ] },
    { key: 'rightOperand', label: 'Right Operand', type: 'text', placeholder: '"expected"' },
  ],
  switch: [
    { key: 'cases', label: 'Cases', type: 'array-object', subFields: [
      { key: 'label', label: 'Label', type: 'text', placeholder: 'Case 1' },
      { key: 'expression', label: 'Expression', type: 'text', placeholder: 'value === "A"' },
    ] },
  ],
  loop: [
    { key: 'maxIterations', label: 'Max Iterations', type: 'number', placeholder: '100' },
    { key: 'collectionPath', label: 'Collection Path', type: 'text', placeholder: 'data.items' },
  ],
  retry: [
    { key: 'maxRetries', label: 'Max Retries', type: 'number', placeholder: '3' },
    { key: 'delayMs', label: 'Delay (ms)', type: 'number', placeholder: '1000' },
    { key: 'backoff', label: 'Backoff', type: 'select', options: [
      { value: 'fixed', label: 'Fixed' }, { value: 'linear', label: 'Linear' }, { value: 'exponential', label: 'Exponential' },
    ] },
  ],
  delay: [
    { key: 'durationMs', label: 'Duration (ms)', type: 'number', placeholder: '5000' },
  ],

  // ── AI ──
  llm: [
    { key: 'model', label: 'Model', type: 'select', options: [
      { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }, { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }, { value: 'llama-3.1-70b', label: 'Llama 3.1 70B' },
    ] },
    { key: 'temperature', label: 'Temperature', type: 'number', placeholder: '0.7' },
    { key: 'maxTokens', label: 'Max Tokens', type: 'number', placeholder: '2048' },
    { key: 'systemPrompt', label: 'System Prompt', type: 'textarea', placeholder: 'You are a helpful assistant...' },
  ],
  agent: [
    { key: 'model', label: 'Model', type: 'select', options: [
      { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' }, { value: 'llama-3.1-70b', label: 'Llama 3.1 70B' },
    ] },
    { key: 'tools', label: 'Tools', type: 'text', placeholder: 'search,calculator,api' },
    { key: 'maxIterations', label: 'Max Iterations', type: 'number', placeholder: '10' },
  ],
  rag: [
    { key: 'vectorStore', label: 'Vector Store', type: 'select', options: [
      { value: 'pinecone', label: 'Pinecone' }, { value: 'weaviate', label: 'Weaviate' },
      { value: 'qdrant', label: 'Qdrant' }, { value: 'chroma', label: 'Chroma' },
    ] },
    { key: 'topK', label: 'Top K', type: 'number', placeholder: '5' },
    { key: 'similarityThreshold', label: 'Similarity Threshold', type: 'number', placeholder: '0.7' },
  ],
  classifier: [
    { key: 'categories', label: 'Categories', type: 'text', placeholder: 'urgent,normal,low' },
    { key: 'model', label: 'Model', type: 'select', options: [
      { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    ] },
  ],
  summarizer: [
    { key: 'model', label: 'Model', type: 'select', options: [
      { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    ] },
    { key: 'maxLength', label: 'Max Length', type: 'number', placeholder: '500' },
    { key: 'format', label: 'Format', type: 'select', options: [
      { value: 'paragraph', label: 'Paragraph' }, { value: 'bullet-points', label: 'Bullet Points' },
      { value: 'executive', label: 'Executive Summary' },
    ] },
  ],

  // ── Human ──
  approval: [
    { key: 'assignee', label: 'Assignee', type: 'text', placeholder: 'manager@company.com' },
    { key: 'slaMinutes', label: 'SLA (minutes)', type: 'number', placeholder: '60' },
    { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Please review and approve...' },
  ],
  review: [
    { key: 'assignee', label: 'Assignee', type: 'text', placeholder: 'reviewer@company.com' },
    { key: 'slaMinutes', label: 'SLA (minutes)', type: 'number', placeholder: '120' },
    { key: 'checklist', label: 'Checklist', type: 'array-string', placeholder: 'Add checklist item...' },
  ],
  escalation: [
    { key: 'escalationPath', label: 'Escalation Path', type: 'array-string', placeholder: 'Add assignee...' },
    { key: 'priority', label: 'Priority', type: 'select', options: [
      { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
    ] },
  ],

  // ── Action ──
  crm: [
    { key: 'action', label: 'Action', type: 'select', options: [
      { value: 'create', label: 'Create' }, { value: 'update', label: 'Update' },
      { value: 'delete', label: 'Delete' }, { value: 'query', label: 'Query' },
    ] },
    { key: 'objectType', label: 'Object Type', type: 'select', options: [
      { value: 'contact', label: 'Contact' }, { value: 'deal', label: 'Deal' },
      { value: 'account', label: 'Account' }, { value: 'lead', label: 'Lead' },
    ] },
    { key: 'fields', label: 'Fields (JSON)', type: 'textarea', placeholder: '{"key": "value"}' },
  ],
  email: [
    { key: 'to', label: 'To', type: 'text', placeholder: 'user@example.com' },
    { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Notification' },
    { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Email content...' },
  ],
  slack: [
    { key: 'channel', label: 'Channel', type: 'text', placeholder: '#general' },
    { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Hello team!' },
    { key: 'threadTs', label: 'Thread TS', type: 'text', placeholder: '1234567890.123456' },
  ],
  whatsapp: [
    { key: 'to', label: 'To', type: 'text', placeholder: '+1-555-0142' },
    { key: 'template', label: 'Template', type: 'text', placeholder: 'hello_template' },
    { key: 'parameters', label: 'Parameters (JSON)', type: 'textarea', placeholder: '{"name": "John"}' },
  ],
  database: [
    { key: 'query', label: 'Query', type: 'textarea', placeholder: 'SELECT * FROM table' },
    { key: 'parameters', label: 'Parameters (JSON)', type: 'textarea', placeholder: '{"id": 1}' },
  ],
}

// ─── Field Renderer ─────────────────────────────

function ConfigField({
  field,
  value,
  onChange,
}: {
  field: ConfigFieldDef
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  const strVal = value != null ? String(value) : ''

  switch (field.type) {
    case 'text':
      return (
        <Input
          value={strVal}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          className="h-7 text-xs bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-zinc-600"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={strVal}
          onChange={(e) => {
            const v = e.target.value
            onChange(field.key, v === '' ? '' : Number(v))
          }}
          placeholder={field.placeholder}
          className="h-7 text-xs bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-zinc-600"
        />
      )

    case 'textarea':
      return (
        <Textarea
          value={strVal}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="text-xs bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-zinc-600 min-h-[60px] resize-y"
        />
      )

    case 'select':
      return (
        <Select value={strVal || undefined} onValueChange={(v) => onChange(field.key, v)}>
          <SelectTrigger className="h-7 text-xs bg-zinc-950 border-zinc-700 text-zinc-200 focus:ring-zinc-600 w-full">
            <SelectValue placeholder={field.placeholder ?? 'Select...'} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'switch':
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value === true || value === 'true'}
            onCheckedChange={(checked) => onChange(field.key, checked)}
          />
          <span className="text-[10px] text-zinc-500">{value === true || value === 'true' ? 'Enabled' : 'Disabled'}</span>
        </div>
      )

    case 'array-string': {
      const arr = (Array.isArray(value) ? value : []) as string[]
      return (
        <div className="space-y-1.5">
          {arr.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                value={item}
                onChange={(e) => {
                  const next = [...arr]
                  next[i] = e.target.value
                  onChange(field.key, next)
                }}
                placeholder={field.placeholder}
                className="h-6 text-[11px] bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 flex-1 focus-visible:ring-zinc-600"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  const next = arr.filter((_, idx) => idx !== i)
                  onChange(field.key, next)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 w-full"
            onClick={() => onChange(field.key, [...arr, ''])}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </Button>
        </div>
      )
    }

    case 'array-object': {
      const arr = (Array.isArray(value) ? value : []) as Record<string, unknown>[]
      const subFields = field.subFields ?? []
      return (
        <div className="space-y-2">
          {arr.map((item, i) => (
            <div key={i} className="rounded-md border border-zinc-800 bg-zinc-950/50 p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono">#{i + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => {
                    const next = arr.filter((_, idx) => idx !== i)
                    onChange(field.key, next)
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
              {subFields.map((sf) => (
                <div key={sf.key} className="space-y-0.5">
                  <Label className="text-[10px] text-zinc-500">{sf.label}</Label>
                  {sf.type === 'select' ? (
                    <Select
                      value={String(item[sf.key] ?? '')}
                      onValueChange={(v) => {
                        const next = [...arr]
                        next[i] = { ...next[i], [sf.key]: v }
                        onChange(field.key, next)
                      }}
                    >
                      <SelectTrigger className="h-6 text-[11px] bg-zinc-950 border-zinc-700 text-zinc-200 w-full">
                        <SelectValue placeholder={sf.placeholder ?? 'Select...'} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {sf.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs text-zinc-200 focus:bg-zinc-800">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : sf.type === 'textarea' ? (
                    <Textarea
                      value={String(item[sf.key] ?? '')}
                      onChange={(e) => {
                        const next = [...arr]
                        next[i] = { ...next[i], [sf.key]: e.target.value }
                        onChange(field.key, next)
                      }}
                      placeholder={sf.placeholder}
                      rows={2}
                      className="text-[11px] bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 min-h-[40px] resize-y"
                    />
                  ) : (
                    <Input
                      value={String(item[sf.key] ?? '')}
                      onChange={(e) => {
                        const next = [...arr]
                        next[i] = { ...next[i], [sf.key]: e.target.value }
                        onChange(field.key, next)
                      }}
                      placeholder={sf.placeholder}
                      className="h-6 text-[11px] bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-zinc-600"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[10px] border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 w-full"
            onClick={() => {
              const newItem: Record<string, unknown> = {}
              subFields.forEach((sf) => { newItem[sf.key] = '' })
              onChange(field.key, [...arr, newItem])
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Case
          </Button>
        </div>
      )
    }

    default:
      return null
  }
}

// ─── Main Component ─────────────────────────────

export function NodeConfigPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId)
  const nodes = useWorkflowStore((s) => s.nodes)
  const updateNodeConfig = useWorkflowStore((s) => s.updateNodeConfig)
  const updateNodeLabel = useWorkflowStore((s) => s.updateNodeLabel)
  const selectNode = useWorkflowStore((s) => s.selectNode)
  const removeNode = useWorkflowStore((s) => s.removeNode)

  const node = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  )

  const cat = useMemo(
    () => node ? getCategoryForType(node.type) : null,
    [node]
  )

  const schema = useMemo(
    () => node ? (CONFIG_SCHEMA[node.type] ?? []) : [],
    [node]
  )

  const categoryIcons = useMemo(() => {
    if (!cat) return {}
    return ALL_ICONS[cat.category] ?? {}
  }, [cat])

  const Icon = useMemo(() => {
    if (!node || !cat) return Zap
    return categoryIcons[node.type] ?? Zap
  }, [node, cat, categoryIcons])

  const handleConfigChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return
      updateNodeConfig(selectedNodeId, { [key]: value })
    },
    [selectedNodeId, updateNodeConfig]
  )

  const handleLabelChange = useCallback(
    (label: string) => {
      if (!selectedNodeId) return
      updateNodeLabel(selectedNodeId, label)
    },
    [selectedNodeId, updateNodeLabel]
  )

  const handleDelete = useCallback(() => {
    if (!selectedNodeId) return
    removeNode(selectedNodeId)
    selectNode(null)
  }, [selectedNodeId, removeNode, selectNode])

  if (!node || !cat) return null

  return (
    <div className="h-full flex flex-col bg-zinc-900/80">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded flex items-center justify-center ${cat.bgColor} border ${cat.borderColor}`}>
              <Icon className={`h-3 w-3 ${cat.color}`} />
            </div>
            <Badge variant="outline" className={`text-[10px] ${cat.borderColor} ${cat.color}`}>
              {cat.label}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
            onClick={() => selectNode(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Editable Label */}
        <Input
          value={node.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          className="h-7 text-sm font-medium bg-zinc-950 border-zinc-700 text-zinc-100 focus-visible:ring-zinc-600"
        />
        <p className="text-[10px] text-zinc-600 mt-1.5 font-mono">
          type: {node.type} · id: {node.id.slice(0, 16)}...
        </p>
      </div>

      {/* Config Fields */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {schema.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
              <p className="text-xs">No configurable fields</p>
              <p className="text-[10px] opacity-60">This node type has no config schema</p>
            </div>
          )}

          {schema.map((field, i) => (
            <div key={field.key}>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  {field.label}
                </Label>
                <ConfigField
                  field={field}
                  value={node.config[field.key]}
                  onChange={handleConfigChange}
                />
              </div>
              {i < schema.length - 1 && <Separator className="mt-3 bg-zinc-800/50" />}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 shrink-0">
        <Button
          variant="destructive"
          size="sm"
          className="w-full h-7 text-xs gap-1.5 bg-red-600/80 hover:bg-red-600 text-white"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
          Delete Node
        </Button>
      </div>
    </div>
  )
}
