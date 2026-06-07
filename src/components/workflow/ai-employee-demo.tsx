'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
  Headphones,
  Mail,
  Brain,
  Search,
  GitBranch,
  UserCheck,
  Send,
  Loader2,
  Check,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Bot,
  Eye,
} from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { useExecutionStore } from '@/stores/execution-store'
import { toast } from '@/hooks/use-toast'
import { autoLayout } from '@/lib/auto-layout'
import { WORKFLOW_TEMPLATES } from '@/lib/templates'
import { executeWorkflow } from '@/lib/engine'
import type { NodeDefinition, EdgeDefinition } from '@/lib/types'

// ─── Demo Emails ──────────────────────────────────

const DEMO_EMAILS = [
  {
    from: 'sarah.johnson@acmecorp.com',
    subject: 'Billing discrepancy on March invoice',
    body: 'Hi, I noticed a $47.50 charge on my March invoice that doesn\'t match my subscription plan. I\'ve been a customer for 2 years and this is the first time I\'ve seen this. Can you please review and correct? Thanks, Sarah',
    category: 'billing',
    urgency: 'normal',
  },
  {
    from: 'mike.chen@startup.io',
    subject: 'URGENT: Production server down - all users affected',
    body: 'Our production instance has been down for 30 minutes. None of our users can access the platform. This is critical — we\'re losing $10K/hour in revenue. Need immediate assistance!',
    category: 'technical',
    urgency: 'urgent',
  },
  {
    from: 'lisa.park@enterprise.com',
    subject: 'How to set up SSO for our team?',
    body: 'We just signed up for the Enterprise plan and need to configure SAML SSO for our 200-person team. The docs mention it but I can\'t find the exact steps. Can you help?',
    category: 'account',
    urgency: 'normal',
  },
]

// ─── Pipeline Step Types ──────────────────────────

interface PipelineStep {
  id: string
  type: 'email' | 'classifier' | 'condition' | 'rag' | 'llm' | 'approval' | 'escalation' | 'slack' | 'send'
  label: string
  icon: typeof Mail
  status: 'pending' | 'running' | 'done' | 'skipped'
  output?: string
  detail?: string
}

// ─── Props ────────────────────────────────────────

interface AIEmployeeDemoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Component ────────────────────────────────────

export function AIEmployeeDemo({ open, onOpenChange }: AIEmployeeDemoProps) {
  const [selectedEmail, setSelectedEmail] = useState<number | null>(null)
  const [customEmail, setCustomEmail] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [customFrom, setCustomFrom] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([])
  const [finalResponse, setFinalResponse] = useState<string | null>(null)
  const [useCustom, setUseCustom] = useState(false)
  const abortRef = useRef(false)

  const addNode = useWorkflowStore((s) => s.addNode)
  const addEdgeToStore = useWorkflowStore((s) => s.addEdge)
  const setName = useWorkflowStore((s) => s.setName)
  const reset = useWorkflowStore((s) => s.reset)

  // ─── Simulate pipeline execution ───────────────
  const runPipeline = useCallback(async (email: typeof DEMO_EMAILS[0]) => {
    abortRef.current = false
    setIsProcessing(true)
    setFinalResponse(null)

    // Determine the classification based on email content
    const isUrgent = email.urgency === 'urgent' || email.subject.toLowerCase().includes('urgent')
    const classification = email.category
    const confidence = isUrgent ? 65 : 92 // Urgent emails have lower confidence for demo purposes

    const steps: PipelineStep[] = [
      { id: 'email', type: 'email', label: 'Email Received', icon: Mail, status: 'pending' },
      { id: 'classifier', type: 'classifier', label: 'Classify Issue', icon: Brain, status: 'pending' },
      { id: 'condition', type: 'condition', label: `Confidence > 80%?`, icon: GitBranch, status: 'pending' },
      // High confidence path
      { id: 'rag', type: 'rag', label: 'Search Knowledge Base', icon: Search, status: 'pending' },
      { id: 'llm', type: 'llm', label: 'Draft Response', icon: Bot, status: 'pending' },
      { id: 'approval', type: 'approval', label: 'Human Review', icon: UserCheck, status: 'pending' },
      { id: 'send', type: 'send', label: 'Send Response', icon: Send, status: 'pending' },
      // Low confidence path
      { id: 'escalation', type: 'escalation', label: 'Escalate to Human', icon: AlertTriangle, status: 'pending' },
      { id: 'slack', type: 'slack', label: 'Notify Team', icon: MessageSquare, status: 'pending' },
    ]

    setPipelineSteps(steps)

    // Helper to update step
    const updateStep = (id: string, updates: Partial<PipelineStep>) => {
      setPipelineSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    }

    // Helper to mark step as running, wait, then done
    const runStep = async (id: string, output: string, detail?: string) => {
      if (abortRef.current) return
      updateStep(id, { status: 'running' })
      await delay(800 + Math.random() * 1200)
      if (abortRef.current) return
      updateStep(id, { status: 'done', output, detail })
    }

    // Step 1: Email received
    await runStep('email', `From: ${email.from}`, `Subject: ${email.subject}`)

    // Step 2: Classify
    await runStep('classifier',
      `${classification} (confidence: ${confidence}%)`,
      `Analyzed email content and determined this is a ${classification} issue`
    )

    // Step 3: Condition check
    if (confidence >= 80) {
      await runStep('condition', `Yes (${confidence}% >= 80%)`, 'Taking high-confidence path')

      // Skip low-confidence path
      updateStep('escalation', { status: 'skipped' })
      updateStep('slack', { status: 'skipped' })

      // Step 4: RAG search
      await runStep('rag',
        `Found 3 relevant articles`,
        `• KB-142: ${classification} FAQ and troubleshooting\n• KB-089: Common ${classification} resolution steps\n• KB-203: Account management best practices`
      )

      // Step 5: Draft response
      const responseMap: Record<string, string> = {
        billing: `Hi ${email.from.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')},\n\nThank you for reaching out about the billing discrepancy on your March invoice. I've reviewed your account and found the $47.50 charge — it appears to be a prorated adjustment from your plan upgrade on March 15th.\n\nI've initiated a credit of $47.50 to your account, which will appear on your next invoice. If you have any further questions, please don't hesitate to reach out.\n\nBest regards,\nAI Support Agent`,
        technical: `Hi ${email.from.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')},\n\nI understand you're experiencing a technical issue. Based on our knowledge base, I recommend the following steps:\n\n1. Check our status page at status.example.com\n2. Try clearing your browser cache and cookies\n3. If the issue persists, try accessing from an incognito window\n\nIf none of these steps resolve the issue, I'll escalate this to our engineering team immediately.\n\nBest regards,\nAI Support Agent`,
        account: `Hi ${email.from.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')},\n\nThanks for your question about SSO setup! Here's a quick guide:\n\n1. Navigate to Settings → Security → SSO Configuration\n2. Select "SAML 2.0" as your provider\n3. Enter your Identity Provider metadata URL\n4. Map your user attributes (email, name, role)\n5. Test the connection with a single user first\n\nFor detailed steps with screenshots, check our Enterprise SSO Guide in the documentation.\n\nBest regards,\nAI Support Agent`,
      }

      const draftResponse = responseMap[classification] || responseMap.billing
      await runStep('llm', 'Response drafted', draftResponse)

      // Step 6: Approval
      await runStep('approval', 'Auto-approved (high confidence)', 'Response meets quality threshold')

      // Step 7: Send
      await runStep('send', `Sent to ${email.from}`, `Subject: Re: ${email.subject}`)

      setFinalResponse(draftResponse)
    } else {
      // Low confidence path
      await runStep('condition', `No (${confidence}% < 80%)`, 'Escalating to human agent')

      // Skip high-confidence path
      updateStep('rag', { status: 'skipped' })
      updateStep('llm', { status: 'skipped' })
      updateStep('approval', { status: 'skipped' })
      updateStep('send', { status: 'skipped' })

      // Escalation path
      await runStep('escalation', 'Escalated to senior support', `Priority: HIGH\nReason: Low classification confidence (${confidence}%)`)

      // Slack notification
      await runStep('slack', `Posted to #support-escalations`, `⚠️ Low-confidence ticket from ${email.from}\nClassification: ${classification} (${confidence}%)\nNeeds human attention`)

      setFinalResponse(null)
    }

    setIsProcessing(false)
  }, [])

  // ─── Handle demo start ──────────────────────────
  const handleStartDemo = useCallback(async () => {
    const email = useCustom
      ? { from: customFrom || 'user@example.com', subject: customSubject || 'Help request', body: customEmail || 'I need help', category: 'general', urgency: 'normal' }
      : DEMO_EMAILS[selectedEmail ?? 0]

    await runPipeline(email)
  }, [useCustom, selectedEmail, customFrom, customSubject, customEmail, runPipeline])

  // ─── Load workflow to canvas ────────────────────
  const handleLoadWorkflow = useCallback(() => {
    const template = WORKFLOW_TEMPLATES[0] // AI Support Employee
    if (!template) return

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

    const layoutedNodes = autoLayout(nodesToAdd, template.edges.map(e => ({
      id: `edge-0`,
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
    onOpenChange(false)
    toast({ title: 'AI Support Employee loaded!', description: 'Click Run to test the workflow on the canvas' })
  }, [reset, addNode, addEdgeToStore, setName, onOpenChange])

  // ─── Reset demo ─────────────────────────────────
  const handleReset = useCallback(() => {
    abortRef.current = true
    setIsProcessing(false)
    setPipelineSteps([])
    setFinalResponse(null)
    setSelectedEmail(null)
    setCustomEmail('')
    setCustomSubject('')
    setCustomFrom('')
    setUseCustom(false)
  }, [])

  // ─── Close handler ──────────────────────────────
  const handleOpenChange = useCallback((newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      abortRef.current = true
      setTimeout(handleReset, 300)
    }
  }, [onOpenChange, handleReset])

  // ─── Step status styling ────────────────────────
  const stepStatusStyle = (status: PipelineStep['status']) => {
    switch (status) {
      case 'running': return 'border-blue-500/50 bg-blue-500/5'
      case 'done': return 'border-emerald-500/30 bg-emerald-500/5'
      case 'skipped': return 'border-zinc-800 bg-zinc-900/30 opacity-40'
      default: return 'border-zinc-700 bg-zinc-800/30'
    }
  }

  const stepIconColor = (status: PipelineStep['status']) => {
    switch (status) {
      case 'running': return 'text-blue-400'
      case 'done': return 'text-emerald-400'
      default: return 'text-zinc-500'
    }
  }

  const hasStarted = pipelineSteps.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[750px] bg-zinc-900 border-zinc-700 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Headphones className="h-4 w-4 text-cyan-400" />
            </div>
            AI Support Employee — Live Demo
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Watch your AI support employee process a real email in real-time. See classification, knowledge search, and response drafting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {!hasStarted ? (
            /* ─── Email Selection ─────────────────── */
            <>
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 font-medium">Choose a demo email:</p>
                <div className="space-y-2">
                  {DEMO_EMAILS.map((email, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedEmail(i); setUseCustom(false) }}
                      className={`w-full text-left rounded-lg border p-3 transition-all ${
                        selectedEmail === i && !useCustom
                          ? 'border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/20'
                          : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs font-medium text-zinc-200">{email.subject}</span>
                        <Badge variant="outline" className={`text-[9px] h-4 ml-auto shrink-0 ${
                          email.urgency === 'urgent' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-zinc-700/50 border-zinc-600 text-zinc-400'
                        }`}>
                          {email.urgency}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-500 ml-5.5 line-clamp-2">{email.body}</p>
                      <p className="text-[10px] text-zinc-600 mt-1 ml-5.5 font-mono">{email.from}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom email option */}
              <div className="space-y-2">
                <button
                  onClick={() => { setUseCustom(true); setSelectedEmail(null) }}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    useCustom
                      ? 'border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20'
                      : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs font-medium text-zinc-200">Write your own email</span>
                  </div>
                </button>
                {useCustom && (
                  <div className="space-y-2 pl-2">
                    <input
                      type="text"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      placeholder="From: customer@company.com"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-violet-600"
                    />
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Subject: Your issue"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-violet-600"
                    />
                    <Textarea
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="Write the email body..."
                      rows={3}
                      className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-violet-600 resize-none text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Start button */}
              <div className="flex gap-2">
                <Button
                  onClick={handleStartDemo}
                  disabled={(selectedEmail === null && !useCustom) || (useCustom && !customEmail.trim())}
                  className="flex-1 h-10 gap-2 bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  Run AI Support Demo
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLoadWorkflow}
                  className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Workflow
                </Button>
              </div>
            </>
          ) : (
            /* ─── Pipeline Execution View ──────────── */
            <>
              {/* Pipeline steps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500 font-medium">Pipeline execution:</p>
                  {isProcessing && (
                    <Badge className="text-[10px] gap-1 bg-blue-500/10 text-blue-400 border-blue-500/30">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Processing
                    </Badge>
                  )}
                  {!isProcessing && pipelineSteps.some(s => s.status === 'done') && (
                    <Badge className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      <Check className="h-2.5 w-2.5" /> Complete
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  {pipelineSteps.map((step) => {
                    const Icon = step.icon
                    return (
                      <div
                        key={step.id}
                        className={`rounded-lg border p-2.5 transition-all ${stepStatusStyle(step.status)}`}
                      >
                        <div className="flex items-center gap-2">
                          {step.status === 'running' ? (
                            <Loader2 className={`h-4 w-4 animate-spin ${stepIconColor(step.status)}`} />
                          ) : step.status === 'done' ? (
                            <Check className={`h-4 w-4 ${stepIconColor(step.status)}`} />
                          ) : step.status === 'skipped' ? (
                            <div className="h-4 w-4 flex items-center justify-center text-zinc-600">—</div>
                          ) : (
                            <Icon className={`h-4 w-4 ${stepIconColor(step.status)}`} />
                          )}
                          <span className={`text-xs font-medium ${
                            step.status === 'skipped' ? 'text-zinc-600 line-through' : 'text-zinc-200'
                          }`}>
                            {step.label}
                          </span>
                          {step.output && (
                            <Badge variant="outline" className={`text-[9px] h-4 ml-auto shrink-0 ${
                              step.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-zinc-700/50 border-zinc-600 text-zinc-400'
                            }`}>
                              {step.output.length > 40 ? step.output.slice(0, 40) + '...' : step.output}
                            </Badge>
                          )}
                        </div>
                        {step.detail && step.status === 'done' && (
                          <pre className="text-[10px] text-zinc-400 mt-1.5 ml-6 whitespace-pre-wrap font-mono leading-relaxed">
                            {step.detail}
                          </pre>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Final response */}
              {finalResponse && !isProcessing && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 font-medium">AI-generated response:</p>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400">AI Support Employee</span>
                      <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Auto-approved</Badge>
                    </div>
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {finalResponse}
                    </pre>
                  </div>
                </div>
              )}

              {/* Escalation result */}
              {!finalResponse && !isProcessing && pipelineSteps.some(s => s.id === 'escalation' && s.status === 'done') && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 font-medium">Escalation result:</p>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">Escalated to Human Agent</span>
                      <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">Needs Review</Badge>
                    </div>
                    <p className="text-xs text-zinc-400">
                      This email was classified with low confidence and has been escalated to a senior support agent.
                      The team has been notified on Slack and will respond within 30 minutes.
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try Another
                </Button>
                <Button
                  onClick={handleLoadWorkflow}
                  className="flex-1 h-9 gap-2 bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Open in Workflow Builder
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function Play({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
  )
}
