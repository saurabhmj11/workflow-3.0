'use client'

import { useCallback, useMemo, useState, useEffect, ReactNode } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { getCategoryForType, type NodeType } from '@/lib/types'
import { askCopilot } from '@/app/actions/copilot'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useExecutionStore } from '@/stores/execution-store'
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
  Plus, Wrench, PlayCircle, Layers,
  TerminalSquare, Activity, Sparkles, SendHorizontal, Braces,
  type LucideIcon,
} from 'lucide-react'
import { ToolBrowser } from '@/components/mcp/tool-browser'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// ─── Icon map (mirrors agent-node.tsx) ──────────
const TRIGGER_ICONS: Record<string, LucideIcon> = {
  api: Zap, webhook: Webhook, schedule: Clock, email: Mail, 'voice-call': Phone, whatsapp: MessageSquare, subflow: Layers,
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
  crm: Database, email: Send, slack: Hash, whatsapp: MessageCircle, database: Plug, 'trigger-workflow': PlayCircle,
}
const ALL_ICONS: Record<string, Record<string, LucideIcon>> = {
  trigger: TRIGGER_ICONS, logic: LOGIC_ICONS, ai: AI_ICONS, human: HUMAN_ICONS, action: ACTION_ICONS,
}

// ─── Config Schema ──────────────────────────────
type FieldType = 'text' | 'select' | 'textarea' | 'number' | 'switch' | 'array-string' | 'array-object' | 'tools-tag' | 'workflow-select'

interface ConfigFieldDef {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  options?: { value: string; label: string }[]
  /** For array-object, define the sub-fields */
  subFields?: { key: string; label: string; type: 'text' | 'textarea' | 'select' | 'switch'; placeholder?: string; options?: { value: string; label: string }[] }[]
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
  'email-trigger': [
    { key: 'imapServer', label: 'IMAP Server', type: 'text', placeholder: 'imap.gmail.com' },
    { key: 'folder', label: 'Folder', type: 'text', placeholder: 'INBOX' },
  ],
  'voice-call': [
    { key: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '+1-555-0142' },
    { key: 'greeting', label: 'Greeting', type: 'textarea', placeholder: 'Hello, how can I help?' },
  ],
  'whatsapp-trigger': [
    { key: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '+1-555-0142' },
    { key: 'template', label: 'Template', type: 'text', placeholder: 'hello_template' },
  ],
  form: [
    { key: 'title', label: 'Form Title', type: 'text', placeholder: 'Contact Form' },
    { key: 'fields', label: 'Form Fields', type: 'array-object', subFields: [
      { key: 'name', label: 'Field Name', type: 'text', placeholder: 'email' },
      { key: 'type', label: 'Field Type', type: 'select', options: [
        { value: 'text', label: 'Text' }, { value: 'email', label: 'Email' }, { value: 'number', label: 'Number' },
        { value: 'textarea', label: 'Textarea' }, { value: 'select', label: 'Select' }, { value: 'checkbox', label: 'Checkbox' },
      ] },
      { key: 'label', label: 'Label', type: 'text', placeholder: 'Your Email' },
      { key: 'required', label: 'Required', type: 'switch' },
    ] },
    { key: 'successMessage', label: 'Success Message', type: 'text', placeholder: 'Thank you for your submission!' },
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
    { key: 'confidenceThreshold', label: 'Confidence Threshold', type: 'number', placeholder: '0.9' },
  ],
  agent: [
    { key: 'model', label: 'Model', type: 'select', options: [
      { value: 'gpt-4o', label: 'GPT-4o' }, { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' }, { value: 'llama-3.1-70b', label: 'Llama 3.1 70B' },
    ] },
    { key: 'tools', label: 'Tools', type: 'tools-tag', placeholder: 'Add a tool...' },
    { key: 'maxIterations', label: 'Max Iterations', type: 'number', placeholder: '10' },
    { key: 'confidenceThreshold', label: 'Confidence Threshold', type: 'number', placeholder: '0.9' },
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
    { key: 'confidenceThreshold', label: 'Confidence Threshold', type: 'number', placeholder: '0.9' },
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
  'email-action': [
    { key: 'to', label: 'To', type: 'text', placeholder: 'user@example.com' },
    { key: 'subject', label: 'Subject', type: 'text', placeholder: 'Notification' },
    { key: 'body', label: 'Body', type: 'textarea', placeholder: 'Email content...' },
  ],
  slack: [
    { key: 'channel', label: 'Channel', type: 'text', placeholder: '#general' },
    { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Hello team!' },
    { key: 'threadTs', label: 'Thread TS', type: 'text', placeholder: '1234567890.123456' },
  ],
  'whatsapp-action': [
    { key: 'to', label: 'To', type: 'text', placeholder: '+1-555-0142' },
    { key: 'template', label: 'Template', type: 'text', placeholder: 'hello_template' },
    { key: 'parameters', label: 'Parameters (JSON)', type: 'textarea', placeholder: '{"name": "John"}' },
  ],
  database: [
    { key: 'query', label: 'Query', type: 'textarea', placeholder: 'SELECT * FROM table' },
    { key: 'parameters', label: 'Parameters (JSON)', type: 'textarea', placeholder: '{"id": 1}' },
  ],

  // ── Subflow (Trigger) ──
  subflow: [
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'This workflow is triggered by another workflow...' },
  ],

  // ── Trigger Workflow (Action) ──
  'trigger-workflow': [
    { key: 'targetWorkflowId', label: 'Target Workflow', type: 'workflow-select' },
    { key: 'waitForCompletion', label: 'Wait for Completion', type: 'switch' },
    { key: 'passInput', label: 'Pass Input Data', type: 'switch' },
    { key: 'timeoutMs', label: 'Timeout (ms)', type: 'number', placeholder: '30000' },
  ],
}

// ─── Workflow Select Field ──────────────────────────
// Separate component to properly use React hooks for fetching workflows

function WorkflowSelectField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([])
  const [wfLoading, setWfLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/workflows/list')
      .then(r => r.json())
      .then(json => {
        if (!cancelled && json.ok && Array.isArray(json.data)) {
          setWorkflows(json.data)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setWfLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-10 text-sm bg-background border border-input text-foreground rounded-md w-full">
        <SelectValue placeholder={wfLoading ? 'Loading workflows...' : 'Select a workflow...'} />
      </SelectTrigger>
      <SelectContent className="bg-background border border-border rounded-md shadow-md">
        {workflows.length === 0 && !wfLoading && (
          <div className="px-3 py-2 text-sm text-muted-foreground text-center">No workflows found</div>
        )}
        {workflows.map((wf) => (
          <SelectItem key={wf.id} value={wf.id} className="text-sm cursor-pointer my-1">
            {wf.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ─── Variable Picker ────────────────────────────

function VariablePicker({ onSelect, nodes, currentNodeId }: { onSelect: (v: string) => void, nodes: any[], currentNodeId: string }) {
  const availableNodes = nodes.filter(n => n.id !== currentNodeId)
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-blue-500" title="Insert Variable">
          <Braces className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 shadow-lg" align="end" side="bottom">
        <div className="p-2 text-xs font-semibold text-muted-foreground border-b border-border bg-muted/30">
          Insert Variable from Previous Nodes
        </div>
        <ScrollArea className="h-48">
          <div className="p-1 flex flex-col gap-1">
            {availableNodes.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">No previous nodes available.</div>
            ) : (
              availableNodes.map(n => (
                <Button 
                  key={n.id} 
                  variant="ghost" 
                  className="justify-start text-xs h-8 px-2 font-mono hover:bg-blue-50 hover:text-blue-600" 
                  onClick={() => onSelect(`{{${n.id}.output}}`)}
                >
                  <span className="truncate">{n.label || n.type}</span>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// ─── Field Renderer ─────────────────────────────

function ConfigField({
  field,
  value,
  onChange,
  onBrowseTools,
  nodes,
  currentNodeId,
}: {
  field: ConfigFieldDef
  value: unknown
  onChange: (key: string, value: unknown) => void
  onBrowseTools?: () => void
  nodes: any[]
  currentNodeId: string
}) {
  const strVal = value != null ? String(value) : ''

  switch (field.type) {
    case 'text':
      return (
        <div className="relative flex items-center">
          <Input
            value={strVal}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="h-10 text-sm bg-background border-input text-foreground placeholder:text-muted-foreground rounded-md pr-8"
          />
          <div className="absolute right-1">
            <VariablePicker
              nodes={nodes}
              currentNodeId={currentNodeId}
              onSelect={(v) => onChange(field.key, strVal + v)}
            />
          </div>
        </div>
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
          className="h-10 text-sm bg-background border-input text-foreground placeholder:text-muted-foreground rounded-md"
        />
      )

    case 'textarea':
      return (
        <div className="relative">
          <Textarea
            value={strVal}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="text-sm bg-background border-input text-foreground placeholder:text-muted-foreground rounded-md min-h-[80px] resize-y pr-8"
          />
          <div className="absolute top-1 right-1">
            <VariablePicker
              nodes={nodes}
              currentNodeId={currentNodeId}
              onSelect={(v) => onChange(field.key, strVal + v)}
            />
          </div>
        </div>
      )

    case 'select':
      return (
        <Select value={strVal || undefined} onValueChange={(v) => onChange(field.key, v)}>
          <SelectTrigger className="h-10 text-sm bg-background border-input text-foreground rounded-md w-full">
            <SelectValue placeholder={field.placeholder ?? 'Select...'} />
          </SelectTrigger>
          <SelectContent className="bg-background border-border rounded-md shadow-md">
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm cursor-pointer my-1">
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
        <div className="space-y-2">
          {arr.map((item, i) => (
            <div key={i} className="flex items-center gap-2 relative">
              <Input
                value={item}
                onChange={(e) => {
                  const next = [...arr]
                  next[i] = e.target.value
                  onChange(field.key, next)
                }}
                placeholder={field.placeholder}
                className="h-10 text-sm font-medium bg-background border border-border text-foreground placeholder:text-slate-300 flex-1 rounded-lg focus-visible:ring-slate-400 focus-visible:border-slate-400 hover:border-slate-300 transition-colors pr-8"
              />
              <div className="absolute right-12">
                <VariablePicker
                  nodes={nodes}
                  currentNodeId={currentNodeId}
                  onSelect={(v) => {
                    const next = [...arr]
                    next[i] = String(next[i] || '') + v
                    onChange(field.key, next)
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg border-2 border-transparent hover:border-red-200 transition-all"
                onClick={() => {
                  const next = arr.filter((_, idx) => idx !== i)
                  onChange(field.key, next)
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-10 text-sm font-medium border border-border text-muted-foreground hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 w-full rounded-lg transition-all border-dashed"
            onClick={() => onChange(field.key, [...arr, ''])}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Item
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
                    <div className="relative">
                      <Textarea
                        value={String(item[sf.key] ?? '')}
                        onChange={(e) => {
                          const next = [...arr]
                          next[i] = { ...next[i], [sf.key]: e.target.value }
                          onChange(field.key, next)
                        }}
                        placeholder={sf.placeholder}
                        rows={2}
                        className="text-[11px] bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 min-h-[40px] resize-y pr-8"
                      />
                      <div className="absolute top-1 right-1">
                        <VariablePicker
                          nodes={nodes}
                          currentNodeId={currentNodeId}
                          onSelect={(v) => {
                            const next = [...arr]
                            next[i] = { ...next[i], [sf.key]: String(item[sf.key] ?? '') + v }
                            onChange(field.key, next)
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <Input
                        value={String(item[sf.key] ?? '')}
                        onChange={(e) => {
                          const next = [...arr]
                          next[i] = { ...next[i], [sf.key]: e.target.value }
                          onChange(field.key, next)
                        }}
                        placeholder={sf.placeholder}
                        className="h-6 text-[11px] bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-zinc-600 pr-8"
                      />
                      <div className="absolute right-1">
                        <VariablePicker
                          nodes={nodes}
                          currentNodeId={currentNodeId}
                          onSelect={(v) => {
                            const next = [...arr]
                            next[i] = { ...next[i], [sf.key]: String(item[sf.key] ?? '') + v }
                            onChange(field.key, next)
                          }}
                        />
                      </div>
                    </div>
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

    case 'workflow-select':
      return (
        <WorkflowSelectField
          value={strVal}
          onChange={(v) => onChange(field.key, v)}
        />
      )

    case 'tools-tag': {
      // Parse tools from comma-separated string or array
      const rawTools = value as string | string[] | undefined
      const toolsList: string[] = rawTools
        ? Array.isArray(rawTools)
          ? rawTools
          : String(rawTools).split(',').map((s) => s.trim()).filter(Boolean)
        : []

      return (
        <div className="space-y-1.5">
          {toolsList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {toolsList.map((tool, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="h-5 text-[10px] px-1.5 gap-1 border-violet-500/30 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 cursor-default"
                >
                  <Wrench className="h-2.5 w-2.5" />
                  {tool}
                  <button
                    type="button"
                    className="ml-0.5 hover:text-red-400 transition-colors"
                    onClick={() => {
                      const next = toolsList.filter((_, idx) => idx !== i)
                      onChange(field.key, next.join(','))
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Input
              placeholder={field.placeholder}
              className="h-6 text-[11px] bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 flex-1 focus-visible:ring-zinc-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val && !toolsList.includes(val)) {
                    onChange(field.key, [...toolsList, val].join(','))
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2 border-violet-500/30 text-violet-400 hover:text-violet-200 hover:bg-violet-500/10 shrink-0"
              onClick={onBrowseTools}
            >
              <Wrench className="h-3 w-3 mr-1" />
              Browse
            </Button>
          </div>
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
  const [toolBrowserOpen, setToolBrowserOpen] = useState(false)

  // Copilot State
  const [copilotInput, setCopilotInput] = useState('')
  const [copilotMessages, setCopilotMessages] = useState<{id: string, role: 'user' | 'assistant', display: ReactNode}[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const activeResultId = useExecutionStore((s) => s.activeResultId)
  const results = useExecutionStore((s) => s.results)

  const executionStep = useMemo(() => {
    if (!selectedNodeId || !activeResultId) return null
    const run = results.find(r => r.runId === activeResultId)
    if (!run) return null
    return run.steps.find(s => s.nodeId === selectedNodeId) || null
  }, [selectedNodeId, activeResultId, results])

  const node = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  )

  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!copilotInput.trim() || isGenerating || !node || !selectedNodeId) return
    const input = copilotInput
    setCopilotInput('')
    
    const userMsgId = Date.now().toString()
    setCopilotMessages(prev => [...prev, { id: userMsgId, role: 'user', display: <div className="text-xs text-zinc-200">{input}</div> }])
    
    setIsGenerating(true)
    try {
      const response = await askCopilot(input, node.type, node.config)
      setCopilotMessages(prev => [...prev, { id: response.id, role: 'assistant', display: response.display }])
    } catch (err) {
      setCopilotMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', display: <div className="text-xs text-red-400">Error generating response.</div> }])
    } finally {
      setIsGenerating(false)
    }
  }

  const cat = useMemo(
    () => node ? getCategoryForType(node.type) : null,
    [node]
  )

  const schema = useMemo(
    () => {
      if (!node) return []
      if (node.type === 'email') return node.category === 'trigger' ? CONFIG_SCHEMA['email-trigger'] : CONFIG_SCHEMA['email-action']
      if (node.type === 'whatsapp') return node.category === 'trigger' ? CONFIG_SCHEMA['whatsapp-trigger'] : CONFIG_SCHEMA['whatsapp-action']
      return CONFIG_SCHEMA[node.type] ?? []
    },
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

  const handleAddTool = useCallback(
    (toolName: string) => {
      if (!selectedNodeId) return
      const node = nodes.find((n) => n.id === selectedNodeId)
      if (!node) return
      const rawTools = node.config.tools as string | string[] | undefined
      const toolsList: string[] = rawTools
        ? Array.isArray(rawTools)
          ? rawTools
          : String(rawTools).split(',').map((s) => s.trim()).filter(Boolean)
        : []
      if (!toolsList.includes(toolName)) {
        updateNodeConfig(selectedNodeId, { tools: [...toolsList, toolName].join(',') })
      }
    },
    [selectedNodeId, nodes, updateNodeConfig]
  )

  const getSelectedTools = useCallback((): string[] => {
    const node = nodes.find((n) => n.id === selectedNodeId)
    if (!node) return []
    const rawTools = node.config.tools as string | string[] | undefined
    return rawTools
      ? Array.isArray(rawTools)
        ? rawTools
        : String(rawTools).split(',').map((s) => s.trim()).filter(Boolean)
      : []
  }, [nodes, selectedNodeId])

  if (!node || !cat) return null

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cat.bgColor} border  shadow-sm`}>
              <Icon className={`h-6 w-6 ${cat.color}`} />
            </div>
            <Badge variant="outline" className={`text-sm px-3 py-1 font-medium border-2 rounded-md ${cat.borderColor} ${cat.color} bg-background shadow-sm`}>
              {cat.label}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md shrink-0 transition-colors"
            onClick={() => selectNode(null)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Editable Label */}
        <div className="space-y-1">
          <Input
            value={node.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="h-12 text-lg font-medium bg-background border border-blue-200 text-blue-700 focus-visible:ring-1 focus-visible:ring-ring rounded-lg  transition-colors"
          />
        </div>
      </div>

      {/* Config Fields & Inspector Tabs */}
      <Tabs defaultValue="config" className="flex-1 flex flex-col min-h-0 bg-background">
        <div className="px-4 pt-4 shrink-0">
          <TabsList className="w-full h-14 bg-muted border border-border flex rounded-lg p-1 gap-1 shadow-inner">
            <TabsTrigger value="config" className="flex-1 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-blue-600 data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all">
              <Wrench className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="copilot" className="flex-1 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-violet-600 data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all">
              <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
              Magic Helper
            </TabsTrigger>
            <TabsTrigger value="inspector" className="flex-1 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground transition-all relative">
              <Eye className="w-4 h-4 mr-2" />
              Look Inside
              {executionStep?.status === 'running' && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-sm" />
              )}
              {executionStep?.status === 'error' && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-sm" />
              )}
              {executionStep?.status === 'success' && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="config" className="flex-1 min-h-0 m-0 border-none p-0 outline-none flex flex-col data-[state=active]:flex">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {schema.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-background border border-dashed border-border rounded-md m-2">
                  <p className="text-lg font-medium text-muted-foreground">Nothing to change here!</p>
                  <p className="text-sm font-medium mt-1">This block is already perfect.</p>
                </div>
              )}

              {schema.map((field, i) => (
                <div key={field.key} className="bg-background p-4 rounded-md border border-border shadow-sm hover:border-border transition-colors">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      {field.label}
                    </Label>
                    <ConfigField
                      field={field}
                      value={node.config[field.key]}
                      onChange={handleConfigChange}
                      onBrowseTools={field.type === 'tools-tag' ? () => setToolBrowserOpen(true) : undefined}
                      nodes={nodes}
                      currentNodeId={selectedNodeId!}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="copilot" className="flex-1 min-h-0 m-0 border-none p-0 outline-none flex flex-col data-[state=active]:flex bg-violet-50/50 relative">
          <ScrollArea className="flex-1 p-3">
            <div 
              className="space-y-4 pb-16"
              onClick={(e) => {
                const target = e.target as HTMLElement
                const btn = target.closest('.apply-config-btn')
                if (btn && selectedNodeId) {
                  const configStr = btn.getAttribute('data-config')
                  if (configStr) {
                    try {
                      const config = JSON.parse(configStr)
                      Object.keys(config).forEach(k => {
                        updateNodeConfig(selectedNodeId, { [k]: config[k] })
                      })
                      // Visual feedback could be added here
                    } catch (err) {}
                  }
                }
              }}
            >
              {copilotMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
                  <Sparkles className="w-8 h-8 opacity-40 text-violet-500" />
                  <p className="text-sm font-medium">Configure with AI</p>
                  <p className="text-xs opacity-80 text-center px-4">Describe what you want this node to do, and I'll generate the configuration for you.</p>
                </div>
              )}
              {copilotMessages.map(msg => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] rounded-lg px-4 py-3 shadow-sm ${
                    msg.role === 'user' ? 'bg-violet-500 border-2 border-violet-600 text-white font-medium' : 'bg-background border-2 border-border text-foreground'
                  }`}>
                    {msg.display}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex items-center gap-1.5 text-violet-500 text-sm font-medium px-1">
                  <Sparkles className="w-4 h-4 animate-pulse text-violet-500" />
                  Thinking...
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-violet-50 via-violet-50 to-transparent">
            <form onSubmit={handleCopilotSubmit} className="relative">
              <Input
                value={copilotInput}
                onChange={e => setCopilotInput(e.target.value)}
                placeholder="E.g. Set up a webhook..."
                className="h-12 text-sm font-medium pr-12 bg-background border border-violet-200 focus-visible:ring-violet-400 rounded-lg"
                disabled={isGenerating}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={isGenerating || !copilotInput.trim()}
                className="absolute right-1 top-1 h-10 w-10 text-violet-400 hover:text-violet-600 hover:bg-violet-100 rounded-md"
              >
                <SendHorizontal className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="inspector" className="flex-1 min-h-0 m-0 border-none p-0 outline-none flex flex-col data-[state=active]:flex bg-background">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {!executionStep ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3 bg-background border border-dashed border-border rounded-md m-2">
                  <Activity className="w-10 h-10 opacity-40 text-blue-500" />
                  <p className="text-sm font-medium">No execution data</p>
                  <p className="text-xs opacity-80 text-center px-4 font-medium">Run the workflow to see inputs and outputs for this block.</p>
                </div>
              ) : (
                <>
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-md shadow-inner ${
                        executionStep.status === 'success' ? 'bg-emerald-500' :
                        executionStep.status === 'error' ? 'bg-red-500' :
                        executionStep.status === 'running' ? 'bg-blue-500 animate-pulse' :
                        'bg-slate-400'
                      }`} />
                      <span className="text-sm font-medium text-foreground capitalize">{executionStep.status}</span>
                    </div>
                    {executionStep.finishedAt && executionStep.startedAt && (
                      <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-lg">
                        {new Date(executionStep.finishedAt).getTime() - new Date(executionStep.startedAt).getTime()}ms
                      </span>
                    )}
                  </div>

                  {/* Error if any */}
                  {executionStep.error && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-red-500 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Error
                      </Label>
                      <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 font-mono wrap-break-word whitespace-pre-wrap">
                        {executionStep.error}
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase">Input Data</Label>
                    <div className="p-3 rounded-lg border border-border bg-background text-sm text-foreground font-mono overflow-x-auto shadow-sm">
                      <pre>{JSON.stringify(executionStep.input, null, 2)}</pre>
                    </div>
                  </div>

                  {/* Output */}
                  {executionStep.output && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase">Output Data</Label>
                      <div className="p-3 rounded-lg border border-border bg-background text-sm text-foreground font-mono overflow-x-auto shadow-sm">
                        <pre>{JSON.stringify(executionStep.output, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {/* Token Usage (if AI) */}
                  {executionStep.tokenUsage && (
                    <div className="flex gap-4 p-3 rounded-lg border border-border bg-background shadow-sm">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Prompt</div>
                        <div className="text-sm font-semibold text-foreground">{executionStep.tokenUsage.prompt}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Completion</div>
                        <div className="text-sm font-semibold text-foreground">{executionStep.tokenUsage.completion}</div>
                      </div>
                      {executionStep.costUsd !== undefined && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Cost</div>
                          <div className="text-sm font-semibold text-emerald-500">${executionStep.costUsd.toFixed(4)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Tool Browser Dialog */}
      <ToolBrowser
        open={toolBrowserOpen}
        onOpenChange={setToolBrowserOpen}
        onAddTool={handleAddTool}
        selectedTools={getSelectedTools()}
      />

      {/* Footer */}
      <div className="p-4 border-t border-border bg-background shrink-0">
        <Button
          variant="destructive"
          size="lg"
          className="w-full h-14 rounded-lg font-medium text-lg bg-red-400 hover:bg-red-500 text-white border-b border-red-600 hover:border-b-0 hover:translate-y-1 transition-all"
          onClick={handleDelete}
        >
          <Trash2 className="h-6 w-6 mr-2" />
          Throw in Trash
        </Button>
      </div>
    </div>
  )
}
