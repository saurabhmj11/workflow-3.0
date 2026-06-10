'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  ArrowRight,
  Zap,
  Lightbulb,
  Headphones,
  Briefcase,
  Calendar,
  Check,
  Plus,
  Trash2,
  Edit3,
  Play,
  Brain,
  Eye,
  GitBranch,
  Shield,
} from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { toast } from '@/hooks/use-toast'
import { autoLayout } from '@/lib/auto-layout'
import { getCategoryForType, type NodeType, type NodeCategory } from '@/lib/types'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

// ─── Types ───────────────────────────────────────
interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestions?: string[]
  workflowAction?: {
    type: 'generate' | 'template' | 'navigate' | 'add_node' | 'edit_node' | 'delete_node' | 'analyze' | 'run'
    label: string
    data?: unknown
  }
  isAiGenerated?: boolean
}

// ─── Suggested Prompts ───────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: Headphones, label: 'I need a support agent that handles emails', color: 'text-cyan-400' },
  { icon: Briefcase, label: 'Build me an SDR that qualifies leads', color: 'text-violet-400' },
  { icon: Calendar, label: 'Create an appointment scheduler bot', color: 'text-emerald-400' },
  { icon: Lightbulb, label: 'Analyze my current workflow and suggest improvements', color: 'text-amber-400' },
]

// ─── AI Copilot Response ─────────────────────────
// Calls the real AI Copilot API endpoint with workflow context

async function getCopilotResponse(
  userMessage: string,
  conversationHistory: CopilotMessage[]
): Promise<CopilotMessage> {
  const msgId = `msg-${Date.now()}`

  try {
    // Get current workflow context for the AI
    const workflowStore = useWorkflowStore.getState()
    const workflowContext = {
      nodes: workflowStore.nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        data: { label: n.label },
      })),
      edges: workflowStore.edges.map(e => ({
        source: e.source,
        target: e.target,
        data: { label: e.sourceHandle },
      })),
      workflowName: workflowStore.name,
    }

    // Build messages array for the AI
    const messages = [
      // Include last 8 messages for context
      ...conversationHistory.slice(-8).map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ]

    const res = await fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        workflowContext,
      }),
    })

    const json = await res.json()

    if (json.ok && json.data) {
      return {
        id: msgId,
        role: 'assistant',
        content: json.data.content || "I'm here to help! Could you tell me more about what you'd like to build?",
        suggestions: json.data.suggestions || [],
        workflowAction: json.data.workflowAction || undefined,
        isAiGenerated: true,
      }
    }

    // API failed — fall back to pattern matching
    return getFallbackResponse(userMessage, msgId)
  } catch (err) {
    console.warn('[Copilot] AI call failed, using fallback:', err)
    return getFallbackResponse(userMessage, msgId)
  }
}

// ─── Fallback Pattern Matching ───────────────────
// Used when the AI API is unavailable

function getFallbackResponse(userMessage: string, msgId: string): CopilotMessage {
  const lowerMessage = userMessage.toLowerCase()

  // ─── Workflow analysis commands ───
  if (lowerMessage.includes('analyz') || lowerMessage.includes('review') || lowerMessage.includes('improve') || lowerMessage.includes('suggest')) {
    const workflowStore = useWorkflowStore.getState()
    const nodes = workflowStore.nodes
    const edges = workflowStore.edges

    const issues: string[] = []
    const suggestions: string[] = []

    // Check for missing trigger
    const hasTrigger = nodes.some(n => {
      try { return getCategoryForType(n.type).category === 'trigger' } catch { return false }
    })
    if (!hasTrigger && nodes.length > 0) issues.push('No trigger node found — workflows need a starting point')

    // Check for missing confidence routing
    const hasAI = nodes.some(n => {
      try { return getCategoryForType(n.type).category === 'ai' } catch { return false }
    })
    const hasCondition = nodes.some(n => n.type === 'condition')
    if (hasAI && !hasCondition) suggestions.push('Add confidence routing — AI nodes should branch based on confidence scores')

    // Check for missing human-in-the-loop
    const hasHuman = nodes.some(n => {
      try { return getCategoryForType(n.type).category === 'human' } catch { return false }
    })
    if (hasAI && !hasHuman) suggestions.push('Add a human approval step before critical actions')

    // Check for disconnected nodes
    const connectedNodeIds = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)])
    const disconnectedNodes = nodes.filter(n => !connectedNodeIds.has(n.id))
    if (disconnectedNodes.length > 0) issues.push(`${disconnectedNodes.length} disconnected node(s): ${disconnectedNodes.map(n => n.label).join(', ')}`)

    // Check for error handling
    const hasRetry = nodes.some(n => n.type === 'retry')
    if (!hasRetry && nodes.length > 3) suggestions.push('Add a retry node for resilience against transient failures')

    if (issues.length === 0 && suggestions.length === 0) {
      return {
        id: msgId,
        role: 'assistant',
        content: `I analyzed your workflow **"${workflowStore.name}"** with ${nodes.length} nodes and ${edges.length} connections.\n\n**Good news**: Your workflow looks solid! It has proper structure and connections. Here are some advanced improvements to consider:`,
        suggestions: ['Add error handling with retry nodes', 'Add a delay node for timing control', 'Connect more integrations', 'Run a test execution'],
        workflowAction: { type: 'analyze', label: 'Re-analyze after changes' },
      }
    }

    const analysisContent = `I analyzed your workflow **"${workflowStore.name}"** with ${nodes.length} nodes and ${edges.length} connections.\n\n${
      issues.length > 0 ? `**Issues found:**\n${issues.map(i => `- ${i}`).join('\n')}\n\n` : ''
    }${
      suggestions.length > 0 ? `**Suggested improvements:**\n${suggestions.map(s => `- ${s}`).join('\n')}` : ''
    }`

    return {
      id: msgId,
      role: 'assistant',
      content: analysisContent,
      suggestions: suggestions.slice(0, 4),
      workflowAction: { type: 'analyze', label: 'Re-analyze after changes' },
    }
  }

  // ─── Add node commands ───
  if (lowerMessage.includes('add') && (lowerMessage.includes('node') || lowerMessage.includes('step') || lowerMessage.includes('approval') || lowerMessage.includes('condition') || lowerMessage.includes('delay') || lowerMessage.includes('llm') || lowerMessage.includes('classifier'))) {
    let nodeType = 'llm'
    let nodeLabel = 'AI Step'
    let nodeCategory = 'ai'

    if (lowerMessage.includes('approval') || lowerMessage.includes('review') || lowerMessage.includes('human')) {
      nodeType = 'approval'; nodeLabel = 'Human Approval'; nodeCategory = 'human'
    } else if (lowerMessage.includes('condition') || lowerMessage.includes('branch') || lowerMessage.includes('if')) {
      nodeType = 'condition'; nodeLabel = 'Condition'; nodeCategory = 'logic'
    } else if (lowerMessage.includes('delay') || lowerMessage.includes('wait') || lowerMessage.includes('pause')) {
      nodeType = 'delay'; nodeLabel = 'Delay'; nodeCategory = 'logic'
    } else if (lowerMessage.includes('classifier') || lowerMessage.includes('classify') || lowerMessage.includes('categoriz')) {
      nodeType = 'classifier'; nodeLabel = 'Classifier'; nodeCategory = 'ai'
    } else if (lowerMessage.includes('email') && (lowerMessage.includes('send') || lowerMessage.includes('action'))) {
      nodeType = 'email'; nodeLabel = 'Send Email'; nodeCategory = 'action'
    } else if (lowerMessage.includes('slack')) {
      nodeType = 'slack'; nodeLabel = 'Slack Message'; nodeCategory = 'action'
    }

    return {
      id: msgId,
      role: 'assistant',
      content: `I'll add a **${nodeLabel}** node to your workflow. This will be placed after your last node and connected automatically.\n\nClick the button below to apply this change:`,
      suggestions: ['Add another node', 'Connect it to a specific node', 'Change the configuration', 'Analyze my workflow'],
      workflowAction: {
        type: 'add_node',
        label: `Add ${nodeLabel}`,
        data: { type: nodeType, label: nodeLabel, category: nodeCategory },
      },
    }
  }

  // ─── Run/Execute commands ───
  if (lowerMessage.includes('run') || lowerMessage.includes('execute') || lowerMessage.includes('test')) {
    return {
      id: msgId,
      role: 'assistant',
      content: `Ready to run your workflow! I'll trigger a test execution with sample input data. You'll see each node execute in real-time on the canvas.\n\nClick below to start:`,
      suggestions: ['What input should I use?', 'Analyze before running', 'Add a test email input'],
      workflowAction: { type: 'run', label: 'Run Workflow' },
    }
  }

  if (lowerMessage.includes('support') || lowerMessage.includes('email') || lowerMessage.includes('ticket') || lowerMessage.includes('help desk')) {
    return {
      id: msgId,
      role: 'assistant',
      content: `Great choice! An **AI Support Employee** is our most popular workflow. Here's what it does:\n\n1. **Receives emails** from your support inbox\n2. **Classifies** the issue type and priority\n3. **Checks confidence** — high confidence auto-responds, low confidence escalates\n4. **Searches your knowledge base** for relevant articles\n5. **Drafts a response** using the customer's context and KB articles\n6. **Routes for approval** if confidence is below threshold\n7. **Sends the response** or **escalates to a human**\n\nThis employee can handle 70-80% of routine support emails automatically, freeing your team for complex issues.`,
      suggestions: ['Add sentiment analysis', 'Connect my Gmail', 'Add Zendesk integration', 'Show me the confidence routing'],
      workflowAction: { type: 'template', label: 'Load AI Support Employee', data: 'ai-support-employee' },
    }
  }

  if (lowerMessage.includes('sdr') || lowerMessage.includes('sales') || lowerMessage.includes('lead') || lowerMessage.includes('qualify')) {
    return {
      id: msgId,
      role: 'assistant',
      content: `An **AI SDR Employee** is perfect for scaling your outbound sales. Here's the flow:\n\n1. **Receives leads** via webhook (from your website, ads, or CRM)\n2. **Classifies** the lead quality (hot, warm, cold) using AI\n3. **Hot leads**: Instantly creates CRM contact + sends personalized email + notifies sales team on Slack\n4. **Warm leads**: AI drafts a nurture email for review\n5. **Cold leads**: Adds to long-term nurture sequence\n\nThis employee works 24/7, responds to hot leads in under 2 minutes, and never lets a lead slip through.`,
      suggestions: ['Connect HubSpot CRM', 'Add Slack notifications', 'Set up lead scoring', 'Create nurture sequence'],
      workflowAction: { type: 'template', label: 'Load SDR Employee', data: 'sdr-employee' },
    }
  }

  if (lowerMessage.includes('recruit') || lowerMessage.includes('hiring') || lowerMessage.includes('candidate') || lowerMessage.includes('interview')) {
    return {
      id: msgId,
      role: 'assistant',
      content: `An **AI Recruiter Employee** can automate your hiring pipeline:\n\n1. **Receives applications** via email or webhook\n2. **Screens resumes** against job requirements using AI\n3. **Classifies candidates**: Strong match, Maybe, Not a fit\n4. **Strong matches**: Auto-schedules interview + sends confirmation email\n5. **Maybe**: Sends skills assessment or follow-up questions\n6. **Not a fit**: Sends polite rejection with feedback\n\nThis saves your recruiting team 10+ hours per week on initial screening.`,
      suggestions: ['Add calendar integration', 'Create rejection templates', 'Score candidates automatically', 'Connect to ATS'],
      workflowAction: { type: 'generate', label: 'Generate Recruiter Workflow' },
    }
  }

  if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') || lowerMessage.includes('booking') || lowerMessage.includes('calendar')) {
    return {
      id: msgId,
      role: 'assistant',
      content: `An **AI Appointment Setter** handles scheduling automatically:\n\n1. **Receives booking requests** via email, chat, or web form\n2. **Checks availability** against your calendar\n3. **Proposes times** that work for both parties\n4. **Sends confirmation** with calendar invite\n5. **Handles rescheduling** and cancellations\n6. **Sends reminders** before appointments\n\nThis employee eliminates the back-and-forth of scheduling entirely.`,
      suggestions: ['Connect Google Calendar', 'Add SMS reminders', 'Handle timezone differences', 'Send intake forms'],
      workflowAction: { type: 'generate', label: 'Generate Appointment Setter' },
    }
  }

  // General fallback
  return {
    id: msgId,
    role: 'assistant',
    content: `I can help you build and manage AI employees for your business. Here are some things I can do:\n\n**Build Workflows** — Describe what you need and I'll generate the workflow\n**Add Nodes** — "Add an approval step" or "Add a delay node"\n**Analyze** — "Analyze my workflow" for improvement suggestions\n**Run** — "Run my workflow" to test it\n\nJust describe what you need, and I'll help. You can also ask me about:\n- **Confidence routing** — How AI quality control works\n- **Integrations** — Connecting Gmail, Slack, Zendesk\n- **Memory** — How AI employees remember customers\n- **Analytics** — Tracking performance in the dashboard`,
    suggestions: ['Build a support agent', 'Create an SDR', 'Analyze my workflow', 'Add an approval step'],
  }
}

// ─── Component ───────────────────────────────────

export function CopilotPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your **OpenWorkflow Copilot** — powered by AI. I can help you build, analyze, and improve workflows.\n\nTry asking me to:\n- **Build** a workflow from scratch\n- **Add** nodes to your canvas\n- **Analyze** your current workflow\n- **Run** a test execution",
      suggestions: ['I need a support agent', 'Build me an SDR', 'Analyze my workflow', 'Add an approval step'],
      isAiGenerated: false,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(async (text?: string) => {
    const message = text ?? input
    if (!message.trim() || loading) return

    const userMsg: CopilotMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: message,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await getCopilotResponse(message, messages)
      setMessages(prev => [...prev, response])
    } catch {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try again?',
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // ─── Handle workflow actions ────────────────────
  const handleAction = useCallback((action: CopilotMessage['workflowAction']) => {
    if (!action) return
    const store = useWorkflowStore.getState()

    switch (action.type) {
      case 'template': {
        // Load a template by triggering the workflow generator
        onOpenChange(false)
        toast({ title: 'Loading template', description: `Loading ${action.label}...` })
        break
      }

      case 'generate': {
        // Trigger the workflow generator
        onOpenChange(false)
        toast({ title: 'AI Generate', description: 'Opening workflow generator...' })
        break
      }

      case 'add_node': {
        // Directly add a node to the canvas
        const data = action.data as { type: string; label: string; category: string }
        if (!data) break

        // Find a good position — after the last node
        const nodes = store.nodes
        const lastNode = nodes[nodes.length - 1]
        const position = lastNode
          ? { x: lastNode.position?.x ?? 250, y: (lastNode.position?.y ?? 0) + 180 }
          : { x: 250, y: 50 }

        const newNodeId = `node-${Date.now()}`
        store.addNode({
          id: newNodeId,
          type: data.type as NodeType,
          label: data.label,
          category: data.category as NodeCategory,
          config: getDefaultConfig(data.type),
          position,
        })

        // If there's a last node, connect them
        if (lastNode) {
          store.addEdge({
            id: `edge-${Date.now()}`,
            source: lastNode.id,
            target: newNodeId,
            sourceHandle: 'default',
            targetHandle: 'input',
          })
        }

        toast({
          title: 'Node added!',
          description: `${data.label} node added to canvas and connected.`,
        })
        break
      }

      case 'analyze': {
        // Re-run analysis
        handleSend('Analyze my current workflow')
        break
      }

      case 'run': {
        // Trigger workflow execution
        onOpenChange(false)
        toast({ title: 'Running workflow', description: 'Starting test execution...' })
        break
      }

      case 'navigate' && typeof action.data === 'string' ? 'navigate' : 'navigate': {
        if (typeof action.data === 'string') {
          window.location.href = action.data
        }
        break
      }
    }
  }, [onOpenChange, handleSend])

  // ─── Action button styling by type ─────────────
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'add_node': return <Plus className="h-3 w-3" />
      case 'analyze': return <Eye className="h-3 w-3" />
      case 'run': return <Play className="h-3 w-3" />
      case 'generate': return <Sparkles className="h-3 w-3" />
      case 'template': return <Zap className="h-3 w-3" />
      default: return <ArrowRight className="h-3 w-3" />
    }
  }

  const getActionColor = (type: string) => {
    switch (type) {
      case 'add_node': return 'from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500'
      case 'analyze': return 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
      case 'run': return 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
      default: return 'from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg h-[650px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-zinc-800 shrink-0">
          <DialogTitle className="text-sm text-zinc-100 flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            OpenWorkflow Copilot
            <Badge variant="outline" className="text-[9px] border-violet-500/30 text-violet-400 ml-auto">
              AI Powered
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-lg p-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-600/20 border border-cyan-500/20 text-cyan-100'
                    : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-300'
                }`}>
                  {msg.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j} className="text-zinc-100 font-semibold">{part.slice(2, -2)}</strong>
                        }
                        return part
                      })}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>

                {/* AI Generated Indicator */}
                {msg.isAiGenerated && msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-1">
                    <Sparkles className="h-2.5 w-2.5 text-violet-400" />
                    <span className="text-[9px] text-violet-400/70">AI generated</span>
                  </div>
                )}

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="text-[10px] px-2 py-1 rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* Workflow Action */}
                {msg.workflowAction && (
                  <Button
                    size="sm"
                    className={`mt-2 h-7 text-[10px] gap-1.5 bg-gradient-to-r ${getActionColor(msg.workflowAction.type)} text-white`}
                    onClick={() => handleAction(msg.workflowAction)}
                  >
                    {getActionIcon(msg.workflowAction.type)}
                    {msg.workflowAction.label}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-6 w-6 rounded-md bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3 w-3 text-cyan-400" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <div className="rounded-lg p-3 bg-zinc-800/50 border border-zinc-700/50">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts (show when conversation is new) */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 shrink-0">
            <div className="grid grid-cols-2 gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => handleSend(prompt.label)}
                  className="flex items-center gap-2 p-2 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 transition-colors text-left"
                >
                  <prompt.icon className={`h-4 w-4 ${prompt.color} shrink-0`} />
                  <span className="text-[10px] text-zinc-300 line-clamp-2">{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you need... (e.g., 'Add an approval step')"
              className="flex-1 h-8 px-3 text-xs bg-zinc-950 border border-zinc-700 rounded-md text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            <Button
              size="icon"
              className="h-8 w-8 shrink-0 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Default Config for Node Types ───────────────
function getDefaultConfig(type: string): Record<string, unknown> {
  switch (type) {
    case 'llm': return { model: 'gpt-4o', systemPrompt: 'You are a helpful AI assistant.', temperature: 0.7 }
    case 'classifier': return { categories: 'urgent,normal,low', model: 'gpt-4o' }
    case 'condition': return { expression: '' }
    case 'approval': return { assignee: '', message: 'Please review and approve.', slaMinutes: 60 }
    case 'delay': return { durationMs: 5000 }
    case 'email': return { to: '{{input.email}}', subject: '', body: '' }
    case 'slack': return { channel: '#general', message: '' }
    case 'crm': return { action: 'update', objectType: 'contact' }
    case 'rag': return { vectorStore: 'default', topK: 5 }
    case 'summarizer': return { model: 'gpt-4o' }
    case 'agent': return { model: 'gpt-4o', systemPrompt: 'You are an autonomous agent.' }
    case 'escalation': return { escalationPath: [], priority: 'high' }
    case 'retry': return { maxRetries: 3, backoffMs: 1000 }
    default: return {}
  }
}
