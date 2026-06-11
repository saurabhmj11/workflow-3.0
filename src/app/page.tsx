'use client'

import Link from 'next/link'
import {
  Zap, Users, Activity, BarChart3, Plug, Brain, Settings,
  Rocket, FlaskConical, Eye, Phone, MessageSquare, Bot,
  Shield, Palette, ArrowRight, Workflow,
  Layers, GitBranch, Clock, CheckCircle2, Headphones,
  LayoutDashboard, Wrench, Cpu,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Feature Cards Data ─────────────────────────────

const FEATURES = [
  {
    icon: Phone,
    label: 'Voice Call & WhatsApp Triggers',
    desc: 'Trigger workflows from phone calls and WhatsApp messages with real-time webhook processing.',
    href: '/integrations',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    tags: ['Twilio', 'WhatsApp Business'],
  },
  {
    icon: Rocket,
    label: 'Deployment Pipeline',
    desc: 'Promote workflows across dev → staging → production with version tracking and rollback.',
    href: '/deployments',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    tags: ['Environments', 'Rollback'],
  },
  {
    icon: Bot,
    label: 'Multi-Agent Orchestration',
    desc: 'Coordinate multiple AI agents with shared context, handoff protocols, and parallel execution.',
    href: '/builder',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    tags: ['Handoffs', 'Parallel'],
  },
  {
    icon: Layers,
    label: 'Plugin Ecosystem',
    desc: 'Extend the platform with custom nodes, integrations, and triggers via a plugin registry.',
    href: '/plugins',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    tags: ['PDF Generator', 'Web Scraper'],
  },
  {
    icon: Eye,
    label: 'Observability',
    desc: 'Full tracing with span trees, structured logs, and real-time metrics for every execution.',
    href: '/observability',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    tags: ['Traces', 'Logs'],
  },
  {
    icon: FlaskConical,
    label: 'Testing Framework',
    desc: 'Write assertions against workflow outputs, confidence scores, and execution paths.',
    href: '/testing',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    tags: ['Assertions', 'CI/CD'],
  },
  {
    icon: MessageSquare,
    label: 'Notification Delivery',
    desc: 'Multi-channel notifications via email, Slack, and webhooks with delivery tracking.',
    href: '/settings',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    tags: ['Email', 'Slack'],
  },
  {
    icon: Shield,
    label: 'SSO / SAML',
    desc: 'Enterprise SSO with SAML 2.0, OIDC, and directory sync for team management.',
    href: '/settings',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    tags: ['SAML', 'OIDC'],
  },
  {
    icon: Palette,
    label: 'White-label / Embed',
    desc: 'Customize branding, domain, and embed workflows in external applications.',
    href: '/settings',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    tags: ['Branding', 'Embed'],
  },
]

// ─── Quick Stats (demo data) ────────────────────────

const QUICK_STATS = [
  { label: 'Workflows', value: '12', icon: Workflow, color: 'text-violet-400' },
  { label: 'Executions', value: '1,847', icon: Zap, color: 'text-cyan-400' },
  { label: 'Success Rate', value: '94.2%', icon: CheckCircle2, color: 'text-emerald-400' },
  { label: 'Avg Duration', value: '2.3s', icon: Clock, color: 'text-amber-400' },
]

// ─── Main Page ──────────────────────────────────────

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_STATS.map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-zinc-900/80 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-zinc-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-violet-950/50 to-cyan-950/50 border-violet-500/20">
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0">
              <Cpu className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                AI Workflow Operating System
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                OpenWorkflow is a full-stack platform for building, deploying, and monitoring AI-powered workflows.
                Design visual workflows with the drag-and-drop builder, orchestrate multiple AI agents, deploy across
                environments, and observe every execution with full tracing and logging.
              </p>
              <div className="flex items-center gap-3">
                <Link href="/builder">
                  <Button size="sm" className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white">
                    <Workflow className="h-4 w-4 mr-2" />
                    Open Builder
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:text-white">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Sections */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Platform Features</h3>
        <p className="text-xs text-zinc-500 mb-4">Everything you need to build and run AI workflows at scale</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(feature => {
            const Icon = feature.icon
            return (
              <Link key={feature.label} href={feature.href}>
                <Card className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 transition-all h-full cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`h-9 w-9 rounded-lg border ${feature.border} ${feature.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${feature.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                          {feature.label}
                          <ArrowRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed mb-3">{feature.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {feature.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[9px] border-zinc-700 text-zinc-500">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Architecture Overview */}
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-cyan-400" />
            Technical Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-emerald-400 mb-3">Core Engine</h4>
              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Workflow Engine</strong> — DAG-based execution with conditional branching, parallel paths, and error recovery</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Agent Orchestrator</strong> — Multi-agent coordination with shared context and handoff protocols</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Deployment Manager</strong> — Environment promotion pipeline with version snapshots and rollback</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Plugin Registry</strong> — Dynamic plugin loading with custom nodes, integrations, and triggers</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-violet-400 mb-3">Observability</h4>
              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Distributed Tracer</strong> — OpenTelemetry-compatible span trees with token and cost tracking</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Structured Logger</strong> — Level-filtered logs with trace correlation and metadata</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Test Framework</strong> — Workflow test runner with assertions on output, status, and cost</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Audit Trail</strong> — Complete action log with user attribution and IP tracking</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-cyan-400 mb-3">Data & Integrations</h4>
              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Memory Layer</strong> — Customer context, knowledge notes, and sentiment tracking</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Trigger System</strong> — Webhook, schedule, email, voice call, WhatsApp, and form triggers</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">Notification Delivery</strong> — Multi-channel delivery with email, Slack, and webhooks</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span><strong className="text-zinc-300">SSO & White-label</strong> — SAML/OIDC auth and customizable branding/embed</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/builder">
          <Card className="bg-zinc-900/80 border-zinc-800 hover:border-violet-500/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Workflow className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Workflow Builder</p>
                <p className="text-[10px] text-zinc-500">Visual drag-and-drop editor</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/demo">
          <Card className="bg-zinc-900/80 border-zinc-800 hover:border-cyan-500/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">AI Employee Demo</p>
                <p className="text-[10px] text-zinc-500">Watch AI agents in action</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/audit">
          <Card className="bg-zinc-900/80 border-zinc-800 hover:border-emerald-500/30 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Audit Trail</p>
                <p className="text-[10px] text-zinc-500">Complete action history</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
