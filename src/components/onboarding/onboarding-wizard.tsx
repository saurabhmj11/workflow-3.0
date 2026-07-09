'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Headphones,
  UserSearch,
  Users,
  Paintbrush,
  Mail,
  MessageSquare,
  Ticket,
  Contact2,
  Calendar,
  Bot,
  Brain,
  Link2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Sparkles,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react'
import { WORKFLOW_TEMPLATES } from '@/lib/templates'
import type { WorkflowTemplate } from '@/lib/templates'
import { useWorkflowStore } from '@/stores/workflow-store'
import { autoLayout } from '@/lib/auto-layout'
import { toast } from '@/hooks/use-toast'

// ─── Types ─────────────────────────────────────────

interface OnboardingWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  onWatchDemo: () => void
}

type StepId = 'welcome' | 'choose' | 'connect' | 'action'

interface Step {
  id: StepId
  title: string
}

const STEPS: Step[] = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'choose', title: 'Choose' },
  { id: 'connect', title: 'Connect' },
  { id: 'action', title: 'Action' },
]

// ─── AI Employee Options (mapped from templates) ──

interface EmployeeOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  popular?: boolean
  template: WorkflowTemplate | null
}

const EMPLOYEE_OPTIONS: EmployeeOption[] = [
  {
    id: 'support',
    name: 'Support Employee',
    description: 'Classifies tickets, searches your knowledge base, drafts responses, and escalates when unsure.',
    icon: <Headphones className="h-6 w-6" />,
    popular: true,
    template: WORKFLOW_TEMPLATES.find((t) => t.id === 'ai-support-employee') ?? null,
  },
  {
    id: 'sdr',
    name: 'SDR Employee',
    description: 'Qualifies inbound leads, enriches them in your CRM, and routes hot leads to your sales team.',
    icon: <UserSearch className="h-6 w-6" />,
    template: WORKFLOW_TEMPLATES.find((t) => t.id === 'sdr-employee') ?? null,
  },
  {
    id: 'recruiter',
    name: 'Recruiter',
    description: 'Screens candidates, schedules interviews, and keeps hiring managers in the loop automatically.',
    icon: <Users className="h-6 w-6" />,
    template: WORKFLOW_TEMPLATES.find((t) => t.id === 'lead-qualification-pipeline') ?? null,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start from scratch and build exactly what you need. We\'ll guide you through it.',
    icon: <Paintbrush className="h-6 w-6" />,
    template: null,
  },
]

// ─── Integration Options ───────────────────────────

interface IntegrationOption {
  id: string
  name: string
  icon: React.ReactNode
  category: string
}

const INTEGRATION_OPTIONS: IntegrationOption[] = [
  { id: 'gmail', name: 'Gmail', icon: <Mail className="h-6 w-6" />, category: 'Email' },
  { id: 'slack', name: 'Slack', icon: <MessageSquare className="h-6 w-6" />, category: 'Messaging' },
  { id: 'zendesk', name: 'Zendesk', icon: <Ticket className="h-6 w-6" />, category: 'Support' },
  { id: 'hubspot', name: 'HubSpot', icon: <Contact2 className="h-6 w-6" />, category: 'CRM' },
  { id: 'outlook', name: 'Outlook', icon: <Calendar className="h-6 w-6" />, category: 'Email' },
]

// ─── Step Components ───────────────────────────────

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-4">
      {/* Logo */}
      <div className="h-16 w-16 rounded-lg bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
        <Bot className="h-8 w-8 text-white" />
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          Welcome to{' '}
          <span className="bg-linear-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            OpenWorkflow AI Employees
          </span>
        </h2>
        <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
          Build AI employees that handle customer support, sales outreach, and operations — automatically.
        </p>
      </div>

      {/* Value Props */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-violet-400" />
          </div>
          <p className="text-xs font-medium text-zinc-200">AI Employees</p>
          <p className="text-[10px] text-zinc-500">that work 24/7</p>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-xs font-medium text-zinc-200">Smart Memory</p>
          <p className="text-[10px] text-zinc-500">learns from every interaction</p>
        </div>
        <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-xs font-medium text-zinc-200">Real Integrations</p>
          <p className="text-[10px] text-zinc-500">with your existing tools</p>
        </div>
      </div>
    </div>
  )
}

function StepChoose({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-zinc-100">Choose Your First AI Employee</h2>
        <p className="text-zinc-500 text-sm">Pick a template to get started — you can always customize later.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {EMPLOYEE_OPTIONS.map((emp) => {
          const isSelected = selectedId === emp.id
          return (
            <button
              key={emp.id}
              onClick={() => onSelect(emp.id)}
              className={`
                relative flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-200
                ${
                  isSelected
                    ? 'bg-violet-500/10 border-violet-500/50 shadow-lg shadow-violet-500/10'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }
              `}
            >
              {emp.popular && (
                <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0 h-4 bg-linear-to-r from-violet-500 to-cyan-500 text-white border-0 font-medium">
                  Popular
                </Badge>
              )}
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  isSelected
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {emp.icon}
              </div>
              <div>
                <p className={`text-sm font-medium ${isSelected ? 'text-violet-200' : 'text-zinc-200'}`}>
                  {emp.name}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{emp.description}</p>
              </div>
              {isSelected && (
                <CheckCircle2 className="absolute bottom-3 right-3 h-4 w-4 text-violet-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepConnect({
  connectedIds,
  onToggle,
}: {
  connectedIds: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-zinc-100">Connect Your Tools</h2>
        <p className="text-zinc-500 text-sm">
          Optional — connect your existing tools so your AI Employee can take real actions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {INTEGRATION_OPTIONS.map((integration) => {
          const isConnected = connectedIds.has(integration.id)
          return (
            <div
              key={integration.id}
              className={`
                flex items-center gap-3 p-3 rounded-xl border transition-all duration-200
                ${
                  isConnected
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-zinc-900/80 border-zinc-800'
                }
              `}
            >
              <div
                className={`
                  h-10 w-10 rounded-lg flex items-center justify-center shrink-0
                  ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}
                `}
              >
                {integration.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{integration.name}</p>
                <p className="text-[10px] text-zinc-500">{integration.category}</p>
              </div>
              <Button
                size="sm"
                variant={isConnected ? 'outline' : 'default'}
                className={`
                  h-7 text-[11px] px-3 gap-1
                  ${
                    isConnected
                      ? 'border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'
                  }
                `}
                onClick={() => onToggle(integration.id)}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepAction() {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-zinc-100">See It In Action</h2>
        <p className="text-zinc-500 text-sm">Your AI Employee is ready! Here&apos;s what happens next:</p>
      </div>

      {/* 3-step explanation */}
      <div className="flex flex-col gap-3 w-full max-w-md">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="h-8 w-8 rounded-full bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">
            1
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              A customer sends an email
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Your AI Employee classifies it by topic and urgency automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="h-4 w-px bg-zinc-700" />
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="h-8 w-8 rounded-full bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">
            2
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              It searches your knowledge base
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Finds relevant articles, past tickets, and drafts a personalized response.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="h-4 w-px bg-zinc-700" />
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="h-8 w-8 rounded-full bg-linear-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">
            3
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">
              If confident, it sends. If not, it escalates to you.
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              You stay in control — low-confidence responses always need your approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Wizard ───────────────────────────────────

export function OnboardingWizard({ open, onOpenChange, onComplete, onWatchDemo }: OnboardingWizardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const addNode = useWorkflowStore((s) => s.addNode)
  const addEdge = useWorkflowStore((s) => s.addEdge)
  const reset = useWorkflowStore((s) => s.reset)
  const setName = useWorkflowStore((s) => s.setName)
  const updateNodePosition = useWorkflowStore((s) => s.updateNodePosition)

  const currentStep = STEPS[stepIndex]
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  // ─── Navigation ───────────────────────────────────
  const goToStep = useCallback((index: number) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStepIndex(index)
      setIsTransitioning(false)
    }, 150)
  }, [])

  const goNext = useCallback(() => {
    if (stepIndex < STEPS.length - 1) {
      goToStep(stepIndex + 1)
    }
  }, [stepIndex, goToStep])

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      goToStep(stepIndex - 1)
    }
  }, [stepIndex, goToStep])

  const handleSkip = useCallback(() => {
    onComplete()
  }, [onComplete])

  // ─── Load Template ────────────────────────────────
  const loadSelectedTemplate = useCallback(() => {
    if (!selectedEmployee) return

    const option = EMPLOYEE_OPTIONS.find((e) => e.id === selectedEmployee)
    if (!option) return

    if (option.template) {
      const template = option.template
      reset()
      setName(template.name)

      // Add nodes from template
      const nodeIds: string[] = []
      for (const node of template.nodes) {
        const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        nodeIds.push(nodeId)
        addNode({
          id: nodeId,
          type: node.type,
          label: node.label,
          category: node.category,
          config: node.config,
          position: node.position,
        })
      }

      // Add edges from template
      for (const edge of template.edges) {
        const sourceId = nodeIds[edge.sourceIndex]
        const targetId = nodeIds[edge.targetIndex]
        if (sourceId && targetId) {
          addEdge({
            id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: sourceId,
            target: targetId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          })
        }
      }

      // Auto-layout after a short delay
      setTimeout(() => {
        const store = useWorkflowStore.getState()
        const layoutedNodes = autoLayout(store.nodes, store.edges)
        for (const node of layoutedNodes) {
          updateNodePosition(node.id, node.position)
        }
      }, 100)

      toast({
        title: `${template.name} loaded`,
        description: 'Your AI Employee is ready! Click Run to test it.',
      })
    } else {
      // Custom — just reset to empty canvas
      reset()
      setName('My Custom AI Employee')
      toast({
        title: 'Starting from scratch',
        description: 'Drag nodes from the palette to build your AI Employee.',
      })
    }
  }, [selectedEmployee, reset, setName, addNode, addEdge, updateNodePosition])

  // ─── Handle Finish (Start Building) ───────────────
  const handleStartBuilding = useCallback(() => {
    loadSelectedTemplate()
    onComplete()
  }, [loadSelectedTemplate, onComplete])

  // ─── Handle Watch Demo ────────────────────────────
  const handleWatchDemo = useCallback(() => {
    loadSelectedTemplate()
    onWatchDemo()
    onComplete()
  }, [loadSelectedTemplate, onWatchDemo, onComplete])

  // ─── Handle Integration Toggle (simulated) ────────
  const handleIntegrationToggle = useCallback((id: string) => {
    if (connectedIds.has(id)) {
      setConnectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      return
    }

    // Simulate connection animation
    setIsConnecting(id)
    setTimeout(() => {
      setConnectedIds((prev) => new Set(prev).add(id))
      setIsConnecting(null)
    }, 1200)
  }, [connectedIds])

  // ─── Reset state when dialog reopens ──────────────
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      setStepIndex(0)
      setSelectedEmployee(null)
      setConnectedIds(new Set())
      setIsConnecting(null)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  // ─── Determine if Next should be disabled ─────────
  const isNextDisabled = stepIndex === 1 && !selectedEmployee

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:max-w-xl p-0 gap-0 overflow-hidden"
      >
        {/* Progress bar at top */}
        <div className="w-full">
          <Progress
            value={progress}
            className="h-1 rounded-none bg-zinc-800 [&>[data-slot=progress-indicator]]:bg-linear-to-r [&>[data-slot=progress-indicator]]:from-violet-500 [&>[data-slot=progress-indicator]]:to-cyan-500"
          />
        </div>

        {/* Step indicator + skip */}
        <div className="flex items-center justify-between px-6 pt-4 pb-0">
          <div className="flex items-center gap-2">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <button
                  onClick={() => i < stepIndex && goToStep(i)}
                  className={`
                    h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-200
                    ${
                      i === stepIndex
                        ? 'bg-linear-to-br from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/20'
                        : i < stepIndex
                          ? 'bg-zinc-700 text-zinc-300 cursor-pointer hover:bg-zinc-600'
                          : 'bg-zinc-800 text-zinc-600'
                    }
                  `}
                >
                  {i < stepIndex ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    i + 1
                  )}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`h-px w-4 ${
                      i < stepIndex ? 'bg-violet-500/50' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-zinc-500 hover:text-zinc-300 gap-1 px-2"
            onClick={handleSkip}
          >
            <SkipForward className="h-3 w-3" />
            Skip
          </Button>
        </div>

        {/* Step Content */}
        <div
          className={`px-6 transition-all duration-150 ${
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          {currentStep.id === 'welcome' && <StepWelcome />}
          {currentStep.id === 'choose' && (
            <StepChoose selectedId={selectedEmployee} onSelect={setSelectedEmployee} />
          )}
          {currentStep.id === 'connect' && (
            <StepConnect connectedIds={connectedIds} onToggle={handleIntegrationToggle} />
          )}
          {currentStep.id === 'action' && <StepAction />}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/50">
          <div>
            {stepIndex > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-zinc-400 hover:text-zinc-200"
                onClick={goBack}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Step-specific actions */}
            {currentStep.id === 'welcome' && (
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-linear-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20 px-5"
                onClick={goNext}
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {currentStep.id === 'choose' && (
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-linear-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20 px-5 disabled:opacity-50"
                onClick={goNext}
                disabled={isNextDisabled}
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {currentStep.id === 'connect' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-zinc-500 hover:text-zinc-300 text-xs"
                  onClick={goNext}
                >
                  Skip for now
                </Button>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-linear-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20 px-5"
                  onClick={goNext}
                >
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {currentStep.id === 'action' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-cyan-500/30 text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-500/50 px-4"
                  onClick={handleWatchDemo}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Watch the Demo
                </Button>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-linear-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white shadow-lg shadow-violet-500/20 px-5"
                  onClick={handleStartBuilding}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Start Building
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Connecting overlay */}
        {isConnecting && (
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-zinc-300">
                Connecting {INTEGRATION_OPTIONS.find((i) => i.id === isConnecting)?.name}...
              </p>
            </div>
          </div>
        )}

        <DialogTitle className="sr-only">Onboarding</DialogTitle>
      </DialogContent>
    </Dialog>
  )
}
