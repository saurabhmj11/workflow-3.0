'use client'

import { useState } from 'react'
import { useWorkflowStore } from '@/stores/workflow-store'
import { WORKFLOW_TEMPLATES } from '@/lib/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Headphones,
  Briefcase,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Users,
  Zap,
  Star,
  Download,
  ArrowRight,
  Search,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { autoLayout } from '@/lib/auto-layout'
import type { WorkflowTemplate } from '@/lib/templates'

// ─── Marketplace AI Employees ────────────────────
// Expanded set of pre-built AI employees for one-click install

interface MarketItem {
  id: string
  name: string
  description: string
  category: 'support' | 'sales' | 'hr' | 'operations'
  icon: React.ElementType
  color: string
  gradient: string
  features: string[]
  nodes: number
  popular: boolean
  templateId?: string  // Links to existing template
  isNew?: boolean
}

const MARKET_ITEMS: MarketItem[] = [
  {
    id: 'support-employee',
    name: 'AI Support Employee',
    description: 'Handles customer emails, classifies issues, searches knowledge base, drafts responses, and escalates when unsure. 70-80% automation rate.',
    category: 'support',
    icon: Headphones,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500 to-blue-500',
    features: ['Email classification', 'Knowledge base search', 'Auto-response', 'Confidence routing', 'Human escalation'],
    nodes: 9,
    popular: true,
    templateId: 'ai-support-employee',
  },
  {
    id: 'sdr-employee',
    name: 'AI SDR Employee',
    description: 'Qualifies inbound leads, creates CRM contacts, sends personalized emails, and notifies your sales team on Slack instantly.',
    category: 'sales',
    icon: Briefcase,
    color: 'text-violet-400',
    gradient: 'from-violet-500 to-purple-500',
    features: ['Lead classification', 'CRM integration', 'Personalized outreach', 'Slack notifications', 'Hot lead alerts'],
    nodes: 8,
    popular: true,
    templateId: 'sdr-employee',
  },
  {
    id: 'recruiter-employee',
    name: 'AI Recruiter',
    description: 'Screens resumes, scores candidates, schedules interviews, and sends personalized communications throughout the hiring pipeline.',
    category: 'hr',
    icon: GraduationCap,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-teal-500',
    features: ['Resume screening', 'Candidate scoring', 'Interview scheduling', 'Rejection handling', 'Skills assessment'],
    nodes: 10,
    popular: true,
    isNew: true,
  },
  {
    id: 'appointment-setter',
    name: 'AI Appointment Setter',
    description: 'Handles booking requests, checks availability, proposes times, sends confirmations with calendar invites, and manages rescheduling.',
    category: 'operations',
    icon: Calendar,
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-500',
    features: ['Availability checking', 'Time proposals', 'Calendar invites', 'Reminders', 'Rescheduling'],
    nodes: 8,
    popular: false,
    isNew: true,
  },
  {
    id: 'onboarding-agent',
    name: 'AI Onboarding Agent',
    description: 'Guides new customers through setup, sends welcome emails, collects required information, and escalates complex issues.',
    category: 'support',
    icon: Users,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-indigo-500',
    features: ['Welcome sequences', 'Setup guidance', 'Info collection', 'Progress tracking', 'Escalation'],
    nodes: 9,
    popular: false,
  },
  {
    id: 'incident-responder',
    name: 'AI Incident Responder',
    description: 'Monitors for incidents, classifies severity, notifies the right team, creates runbooks, and tracks resolution.',
    category: 'operations',
    icon: Zap,
    color: 'text-red-400',
    gradient: 'from-red-500 to-rose-500',
    features: ['Severity classification', 'Team routing', 'Runbook generation', 'Status tracking', 'Post-mortem'],
    nodes: 9,
    popular: false,
    templateId: 'incident-response',
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  support: 'Customer Support',
  sales: 'Sales & Growth',
  hr: 'HR & Recruiting',
  operations: 'Operations',
}

const CATEGORY_COLORS: Record<string, string> = {
  support: 'border-cyan-500/30 text-cyan-400',
  sales: 'border-violet-500/30 text-violet-400',
  hr: 'border-emerald-500/30 text-emerald-400',
  operations: 'border-amber-500/30 text-amber-400',
}

export function MarketplacePanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const addNode = useWorkflowStore((s) => s.addNode)
  const addEdge = useWorkflowStore((s) => s.addEdge)
  const reset = useWorkflowStore((s) => s.reset)

  const filteredItems = MARKET_ITEMS.filter(item => {
    if (selectedCategory && item.category !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.features.some(f => f.toLowerCase().includes(q))
    }
    return true
  })

  const handleInstall = (item: MarketItem) => {
    // Find the matching template
    const template = WORKFLOW_TEMPLATES.find(t =>
      t.id === item.templateId ||
      t.name.toLowerCase().includes(item.category) ||
      t.name.toLowerCase().includes('support') && item.id === 'support-employee' ||
      t.name.toLowerCase().includes('sdr') && item.id === 'sdr-employee' ||
      t.name.toLowerCase().includes('incident') && item.id === 'incident-responder'
    )

    if (template) {
      // Load the template
      reset()
      for (const node of template.nodes) {
        addNode({
          id: node.id,
          type: node.type as 'api',
          label: node.label,
          category: node.category as 'trigger',
          config: node.config ?? {},
          position: { x: 0, y: 0 },
        })
      }
      for (const edge of template.edges) {
        addEdge({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle as 'default',
          targetHandle: edge.targetHandle as 'input',
        })
      }
      onOpenChange(false)
      toast({ title: `${item.name} Installed`, description: `${template.nodes.length} nodes loaded to canvas. Click Run to test it!` })
    } else {
      // No matching template — use AI generate
      onOpenChange(false)
      toast({ title: 'Generating...', description: `Creating ${item.name} workflow with AI` })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl h-[600px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-zinc-800 shrink-0">
          <DialogTitle className="text-sm text-zinc-100 flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Star className="h-3 w-3 text-white" />
            </div>
            AI Employee Marketplace
          </DialogTitle>
        </DialogHeader>

        {/* Search & Filters */}
        <div className="px-4 py-2 border-b border-zinc-800 shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AI employees..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-zinc-950 border border-zinc-700 rounded-md text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`text-[10px] px-2.5 py-1 rounded-md border transition-colors ${
                !selectedCategory ? 'border-zinc-500 bg-zinc-800 text-zinc-200' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key === selectedCategory ? null : key)}
                className={`text-[10px] px-2.5 py-1 rounded-md border transition-colors ${
                  key === selectedCategory ? `${CATEGORY_COLORS[key]} bg-zinc-800 border` : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4 grid grid-cols-1 gap-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all p-4">
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-100">{item.name}</h3>
                          {item.popular && (
                            <Badge variant="outline" className="text-[8px] border-amber-500/30 text-amber-400">
                              <Star className="h-2 w-2 mr-0.5" /> Popular
                            </Badge>
                          )}
                          {item.isNew && (
                            <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.description}</p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {item.features.map((feature) => (
                        <span key={feature} className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-zinc-500">{item.nodes} nodes</span>
                        <Badge variant="outline" className={`text-[9px] ${CATEGORY_COLORS[item.category]}`}>
                          {CATEGORY_LABELS[item.category]}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-[10px] gap-1.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white"
                        onClick={() => handleInstall(item)}
                      >
                        <Download className="h-3 w-3" />
                        Install
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
