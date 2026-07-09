'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Loader2,
  Wand2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  RefreshCw,
  Plus,
  Zap,
  GitBranch,
  Brain,
  UserCheck,
  Send,
  Clock,
  Timer,
  RotateCcw,
  Bot,
  BookOpen,
  Tags,
  FileText,
  Eye,
  AlertTriangle,
  Database,
  Hash,
  MessageCircle,
  Plug,
  Webhook,
  Mail,
  Phone,
  MessageSquare,
  GitMerge,
  Repeat,
  type LucideIcon,
} from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { toast } from '@/hooks/use-toast'
import { autoLayout } from '@/lib/auto-layout'
import { getCategoryForType, type NodeType, type NodeCategory } from '@/lib/types'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from '@/lib/templates'

// ─── Example Prompts ──────────────────────────────

const EXAMPLES = [
  { label: 'Email Support', text: 'When a customer emails, classify the issue, search docs, draft a response, and escalate if confidence is below 80%' },
  { label: 'Lead Qualification', text: 'Create a lead qualification workflow: webhook trigger, score the lead, create deal in CRM, notify sales on Slack' },
  { label: 'Incident Monitor', text: 'Build an incident monitor: check systems every 5 minutes, detect anomalies, escalate if unresolved after 15 min' },
  { label: 'Content Review', text: 'Build a content review pipeline: check submissions against policies, flag unsafe content for human review, auto-approve safe content' },
]

// ─── Smart Template Matching ───────────────────────

/**
 * Simple keyword-based matching to detect if a description closely matches
 * an existing template. Returns the best match with a confidence score.
 */
function matchTemplate(description: string): { template: WorkflowTemplate; confidence: number } | null {
  const lower = description.toLowerCase()
  const words = lower.split(/\s+/).filter(w => w.length > 2)

  let bestMatch: { template: WorkflowTemplate; confidence: number } | null = null

  for (const template of WORKFLOW_TEMPLATES) {
    const templateText = `${template.name} ${template.description} ${template.nodes.map(n => `${n.label} ${n.type}`).join(' ')}`.toLowerCase()

    // Check for keyword matches
    const keywords: Record<string, string[]> = {
      'ai-support-employee': ['email', 'support', 'customer', 'classify', 'knowledge', 'draft', 'response', 'escalat', 'confidence', 'ticket'],
      'sdr-employee': ['lead', 'sales', 'qualif', 'score', 'crm', 'deal', 'nurture', 'sdr', 'hot', 'inbound'],
      'customer-support-triage': ['triage', 'urgent', 'slack', 'normal', 'support', 'ticket', 'route', 'classify'],
      'lead-qualification-pipeline': ['lead', 'qualif', 'pipeline', 'score', 'deal', 'welcome', 'nurture'],
      'incident-response-workflow': ['incident', 'monitor', 'system', 'alert', 'escalat', 'on-call', 'resolve', 'devops', 'server'],
      'content-review-pipeline': ['content', 'review', 'policy', 'safe', 'moderat', 'publish', 'approve', 'flag'],
    }

    const templateKeywords = keywords[template.id] || []
    let matchedKeywords = 0
    for (const keyword of templateKeywords) {
      if (lower.includes(keyword)) matchedKeywords++
    }

    // Calculate confidence
    const keywordConfidence = templateKeywords.length > 0 ? matchedKeywords / templateKeywords.length : 0
    const wordOverlap = words.filter(w => templateText.includes(w)).length / Math.max(words.length, 1)
    const confidence = keywordConfidence * 0.7 + wordOverlap * 0.3

    if (confidence > (bestMatch?.confidence ?? 0) && confidence > 0.3) {
      bestMatch = { template, confidence }
    }
  }

  return bestMatch
}

// ─── Node icon mapping ────────────────────────────

const NODE_ICONS: Record<string, LucideIcon> = {
  api: Zap, webhook: Webhook, schedule: Clock, email: Mail, 'voice-call': Phone, whatsapp: MessageSquare,
  condition: GitBranch, switch: GitMerge, loop: Repeat, retry: RotateCcw, delay: Timer,
  llm: Brain, agent: Bot, rag: BookOpen, classifier: Tags, summarizer: FileText,
  approval: UserCheck, review: Eye, escalation: AlertTriangle,
  crm: Database, slack: Hash, database: Plug,
}
// email (action) and whatsapp (action) handled separately
const ACTION_EMAIL_ICON = Send
const ACTION_WHATSAPP_ICON = MessageCircle

// ─── Category badge styling ───────────────────────

const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  trigger: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  logic: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  ai: { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  human: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  action: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
}

// ─── Types ────────────────────────────────────────

type Step = 'input' | 'preview'

interface GeneratedWorkflow {
  name?: string
  description?: string
  nodes: NodeDefinition[]
  edges: EdgeDefinition[]
  _warnings?: string[]
}

interface WorkflowGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Mini Node Preview Component ──────────────────

function MiniNodeCard({ node }: { node: NodeDefinition }) {
  const cat = getCategoryForType(node.type)
  const catStyle = CATEGORY_STYLES[cat.category] ?? CATEGORY_STYLES.ai

  // Determine icon
  let Icon: LucideIcon
  if (node.type === 'email' && node.category === 'action') {
    Icon = ACTION_EMAIL_ICON
  } else if (node.type === 'whatsapp' && node.category === 'action') {
    Icon = ACTION_WHATSAPP_ICON
  } else {
    Icon = NODE_ICONS[node.type] ?? Zap
  }

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${catStyle.border} ${catStyle.bg}`}>
      <Icon className={`h-3.5 w-3.5 ${catStyle.color} shrink-0`} />
      <span className="text-xs font-medium text-zinc-200 truncate">{node.label}</span>
      <Badge variant="outline" className={`text-[9px] h-4 px-1 ${catStyle.bg} ${catStyle.border} ${catStyle.color} ml-auto shrink-0`}>
        {cat.label}
      </Badge>
    </div>
  )
}

// ─── Main Component ───────────────────────────────

export function WorkflowGenerator({ open, onOpenChange }: WorkflowGeneratorProps) {
  const [step, setStep] = useState<Step>('input')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState<GeneratedWorkflow | null>(null)
  const [refinementInput, setRefinementInput] = useState('')

  const addNode = useWorkflowStore((s) => s.addNode)
  const addEdgeToStore = useWorkflowStore((s) => s.addEdge)
  const setName = useWorkflowStore((s) => s.setName)
  const reset = useWorkflowStore((s) => s.reset)

  // ─── Generate workflow ──────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return

    setLoading(true)
    setError(null)
    setGenerated(null)

    try {
      const res = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })

      const json = await res.json()

      if (!json.ok) {
        setError(json.error || 'Generation failed')
        return
      }

      const workflow = json.data as GeneratedWorkflow
      setGenerated(workflow)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [description])

  // ─── Refine workflow ────────────────────────────
  const handleRefine = useCallback(async () => {
    if (!generated || !refinementInput.trim()) return

    setRefining(true)
    setError(null)

    try {
      const res = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingWorkflow: generated,
          refinement: refinementInput.trim(),
        }),
      })

      const json = await res.json()

      if (!json.ok) {
        setError(json.error || 'Refinement failed')
        return
      }

      const workflow = json.data as GeneratedWorkflow
      setGenerated(workflow)
      setRefinementInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.')
    } finally {
      setRefining(false)
    }
  }, [generated, refinementInput])

  // ─── Apply workflow to canvas ───────────────────
  const handleApply = useCallback(() => {
    if (!generated) return

    // Auto-layout the generated workflow for clean positioning
    const layoutedNodes = autoLayout(generated.nodes, generated.edges, 'TB', 180, 80)

    // Reset current workflow
    reset()

    // Set workflow name
    if (generated.name) {
      setName(generated.name)
    }

    // Add all nodes with auto-layouted positions
    for (const node of layoutedNodes) {
      addNode({
        id: node.id,
        type: node.type as NodeType,
        label: node.label,
        category: node.category as NodeCategory,
        config: node.config ?? {},
        position: node.position,
      })
    }

    // Add all edges
    for (const edge of generated.edges) {
      addEdgeToStore({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: (edge.sourceHandle ?? 'default') as EdgeDefinition['sourceHandle'],
        targetHandle: (edge.targetHandle ?? 'input') as EdgeDefinition['targetHandle'],
      })
    }

    toast({
      title: 'Workflow generated!',
      description: `Created ${generated.nodes.length} nodes and ${generated.edges.length} connections. Click Run to test it!`,
    })

    // Close dialog and reset form
    onOpenChange(false)
    setDescription('')
    setGenerated(null)
    setStep('input')
    setRefinementInput('')
  }, [generated, reset, setName, addNode, addEdgeToStore, onOpenChange])

  // ─── Regenerate from same description ───────────
  const handleRegenerate = useCallback(() => {
    setGenerated(null)
    setStep('input')
    setError(null)
  }, [])

  // ─── Go back to input ───────────────────────────
  const handleBack = useCallback(() => {
    setStep('input')
    setError(null)
  }, [])

  // ─── Close handler ──────────────────────────────
  const handleOpenChange = useCallback((newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      // Reset state when dialog closes
      setStep('input')
      setDescription('')
      setGenerated(null)
      setError(null)
      setRefinementInput('')
    }
  }, [onOpenChange])

  // ─── Smart template match ───────────────────────
  const templateMatch = useMemo(() => {
    if (!description.trim() || description.length < 10) return null
    return matchTemplate(description)
  }, [description])

  // ─── Load a template directly ───────────────────
  const handleLoadTemplate = useCallback((template: WorkflowTemplate) => {
    let counter = 0
    const nodeIdMap: string[] = []

    reset()

    const nodesToAdd: NodeDefinition[] = []
    for (const node of template.nodes) {
      const id = `node-${++counter}-${Date.now()}`
      nodeIdMap.push(id)
      nodesToAdd.push({
        id,
        type: node.type,
        label: node.label,
        category: node.category,
        config: { ...node.config },
        position: { ...node.position },
      })
    }

    // Auto-layout the template nodes
    const layoutedNodes = autoLayout(nodesToAdd, template.edges.map(e => ({
      id: `edge-${0}`,
      source: nodeIdMap[e.sourceIndex],
      target: nodeIdMap[e.targetIndex],
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })), 'TB', 180, 80)

    for (const node of layoutedNodes) {
      addNode(node)
    }

    for (const edge of template.edges) {
      addEdgeToStore({
        id: `edge-${++counter}-${Date.now()}`,
        source: nodeIdMap[edge.sourceIndex],
        target: nodeIdMap[edge.targetIndex],
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })
    }

    setName(template.name)

    toast({
      title: `${template.name} loaded!`,
      description: `Template with ${template.nodes.length} nodes ready. Click Run to test it!`,
    })

    // Close dialog
    onOpenChange(false)
    setDescription('')
    setGenerated(null)
    setStep('input')
    setRefinementInput('')
  }, [reset, addNode, addEdgeToStore, setName, onOpenChange])

  // ─── Derived data for preview ───────────────────
  const previewStats = useMemo(() => {
    if (!generated) return null
    const nodes = generated.nodes
    const byCategory: Record<string, number> = {}
    for (const node of nodes) {
      byCategory[node.category] = (byCategory[node.category] || 0) + 1
    }
    return {
      totalNodes: nodes.length,
      totalEdges: generated.edges.length,
      byCategory,
      hasTrigger: nodes.some(n => n.category === 'trigger'),
      hasHuman: nodes.some(n => n.category === 'human'),
      hasAI: nodes.some(n => n.category === 'ai'),
    }
  }, [generated])

  // ─── Refinement suggestions ─────────────────────
  const refinementSuggestions = useMemo(() => {
    if (!generated) return []
    const suggestions: string[] = []
    const hasCondition = generated.nodes.some(n => n.type === 'condition')
    const hasHuman = generated.nodes.some(n => n.category === 'human')
    const hasDelay = generated.nodes.some(n => n.type === 'delay')

    if (!hasCondition) suggestions.push('Add a condition to branch the workflow')
    if (!hasHuman) suggestions.push('Add a human approval step before critical actions')
    if (!hasDelay) suggestions.push('Add a delay node for timing control')

    return suggestions.slice(0, 3)
  }, [generated])

  // ─── Render ─────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-zinc-900 border-zinc-700 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-violet-400" />
            </div>
            {step === 'input' ? 'Generate Workflow' : 'Preview & Refine'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === 'input'
              ? 'Describe the workflow you want in plain English. AI will create the nodes and connections for you.'
              : 'Review the generated workflow, refine it with natural language, or apply it to the canvas.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-1">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 'input' ? 'text-violet-400' : 'text-zinc-500'}`}>
            <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'input' ? 'bg-violet-500/20 border border-violet-500/50 text-violet-300' : 'bg-zinc-800 border border-zinc-700 text-zinc-500'}`}>
              1
            </div>
            Describe
          </div>
          <div className="flex-1 h-px bg-zinc-700" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 'preview' ? 'text-violet-400' : 'text-zinc-500'}`}>
            <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 'preview' ? 'bg-violet-500/20 border border-violet-500/50 text-violet-300' : 'bg-zinc-800 border border-zinc-700 text-zinc-500'}`}>
              2
            </div>
            Preview & Refine
          </div>
        </div>

        {step === 'input' ? (
          /* ─── Step 1: Input ──────────────────────── */
          <div className="space-y-4 mt-2">
            {/* Text input */}
            <div className="space-y-2">
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setError(null)
                }}
                placeholder="Describe your workflow... e.g., 'When a customer emails, classify the issue, search docs, and draft a response'"
                rows={4}
                className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-violet-600 resize-none"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && description.trim()) {
                    handleGenerate()
                  }
                }}
              />
              <p className="text-[10px] text-zinc-600">Press Ctrl+Enter to generate</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Smart template suggestion */}
            {templateMatch && !loading && (
              <div className="flex items-start gap-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-2.5">
                <Zap className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cyan-300 font-medium">
                    We have a template that matches!
                  </p>
                  <p className="text-xs text-cyan-400/70 mt-0.5">
                    <span className="font-semibold">{templateMatch.template.name}</span>
                    {' — '}
                    {templateMatch.template.description.slice(0, 80)}...
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      className="h-6 gap-1 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white"
                      onClick={() => handleLoadTemplate(templateMatch.template)}
                    >
                      Use Template
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Button>
                    <span className="text-[10px] text-zinc-500">
                      or generate a custom workflow below
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Examples */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 font-medium">Try an example:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {EXAMPLES.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDescription(example.text)
                      setError(null)
                    }}
                    className="text-left text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-md border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-colors"
                    disabled={loading}
                  >
                    <span className="text-violet-400 font-medium block mb-0.5">{example.label}</span>
                    <span className="text-zinc-500 text-[10px] line-clamp-2">{example.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || loading}
              className="w-full h-10 gap-2 bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating workflow...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Workflow
                </>
              )}
            </Button>
          </div>
        ) : (
          /* ─── Step 2: Preview & Refine ──────────── */
          <div className="space-y-4 mt-2">
            {generated && previewStats && (
              <>
                {/* Workflow info */}
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">{generated.name || 'Generated Workflow'}</h3>
                      {generated.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{generated.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-zinc-400 hover:text-zinc-200 shrink-0"
                      onClick={handleRegenerate}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Redo
                    </Button>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] h-5 bg-zinc-700/50 border-zinc-600 text-zinc-300">
                      {previewStats.totalNodes} nodes
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5 bg-zinc-700/50 border-zinc-600 text-zinc-300">
                      {previewStats.totalEdges} edges
                    </Badge>
                    {previewStats.hasTrigger && (
                      <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/10 border-blue-500/30 text-blue-400">
                        Has trigger
                      </Badge>
                    )}
                    {previewStats.hasAI && (
                      <Badge variant="outline" className="text-[10px] h-5 bg-violet-500/10 border-violet-500/30 text-violet-400">
                        AI-powered
                      </Badge>
                    )}
                    {previewStats.hasHuman && (
                      <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 border-amber-500/30 text-amber-400">
                        Human-in-the-loop
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Node flow preview */}
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 font-medium">Workflow nodes:</p>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {generated.nodes.map((node, i) => (
                      <div key={node.id} className="flex items-center gap-2">
                        {i > 0 && (
                          <div className="flex flex-col items-center w-4 shrink-0">
                            <div className="h-3 w-px bg-zinc-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <MiniNodeCard node={node} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings from validation */}
                {generated._warnings && generated._warnings.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-300">
                      {generated._warnings.map((w, i) => (
                        <p key={i}>{w}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {/* Refinement section */}
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 font-medium">Refine with natural language:</p>

                  {/* Quick suggestions */}
                  {refinementSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {refinementSuggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => setRefinementInput(suggestion)}
                          className="text-[10px] text-violet-400 hover:text-violet-300 px-2 py-1 rounded border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
                          disabled={refining}
                        >
                          <Plus className="h-2.5 w-2.5 inline mr-0.5" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Textarea
                      value={refinementInput}
                      onChange={(e) => {
                        setRefinementInput(e.target.value)
                        setError(null)
                      }}
                      placeholder='e.g., "Add a delay of 5 minutes before the email" or "Change the classifier to sort by priority instead"'
                      rows={2}
                      className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-violet-600 resize-none text-xs"
                      disabled={refining}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && refinementInput.trim()) {
                          handleRefine()
                        }
                      }}
                    />
                    <Button
                      onClick={handleRefine}
                      disabled={!refinementInput.trim() || refining}
                      className="h-auto shrink-0 gap-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-50"
                      size="sm"
                    >
                      {refining ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Refine
                    </Button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                  <Button
                    onClick={handleApply}
                    className="flex-1 h-10 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Check className="h-4 w-4" />
                    Apply to Canvas
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
