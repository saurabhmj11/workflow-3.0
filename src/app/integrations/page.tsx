'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  Plug,
  Settings,
  Check,
  Loader2,
  ChevronRight,
  Link2,
  Shield,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

// ─── Types ──────────────────────────────────────────

interface ConnectedIntegration {
  id: string
  name: string
  color: string
  letter: string
  connectedAgo: string
  stat: string
  statLabel: string
  workspace?: string
}

interface AvailableIntegration {
  id: string
  name: string
  description: string
  color: string
  letter: string
  scopes: string[]
}

// ─── Data ────────────────────────────────────────────

const INITIAL_CONNECTED: ConnectedIntegration[] = [
  {
    id: 'slack',
    name: 'Slack',
    color: '#E01E5A',
    letter: 'S',
    connectedAgo: '3 days ago',
    stat: '142',
    statLabel: 'messages sent',
    workspace: 'acme-team',
  },
  {
    id: 'postmark',
    name: 'Postmark',
    color: '#2997D4',
    letter: 'P',
    connectedAgo: '1 week ago',
    stat: '89',
    statLabel: 'emails sent',
  },
]

const AVAILABLE_INTEGRATIONS: AvailableIntegration[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send and receive emails via Google.',
    color: '#EA4335',
    letter: 'G',
    scopes: [
      'Read your emails',
      'Send emails on your behalf',
      'Manage email labels',
    ],
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Microsoft 365 email integration.',
    color: '#0078D4',
    letter: 'O',
    scopes: [
      'Read your mail',
      'Send mail',
      'Access your contacts',
    ],
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Sync tickets and customer data.',
    color: '#78A300',
    letter: 'Z',
    scopes: [
      'Read tickets',
      'Create and update tickets',
      'Access user profiles',
    ],
  },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'Live chat and customer messaging.',
    color: '#1F8DED',
    letter: 'I',
    scopes: [
      'Read conversations',
      'Send messages',
      'Access user data',
    ],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM contacts, deals, and pipelines.',
    color: '#FF7A59',
    letter: 'H',
    scopes: [
      'Read contacts',
      'Manage deals',
      'Access company data',
    ],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise CRM and sales cloud.',
    color: '#00A1E0',
    letter: 'S',
    scopes: [
      'Access Salesforce objects',
      'Read and modify records',
      'Query via SOQL',
    ],
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Issue tracking and project management.',
    color: '#0052CC',
    letter: 'J',
    scopes: [
      'Read issues',
      'Create and update issues',
      'Access project boards',
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Orders, products, and customer data.',
    color: '#96BF48',
    letter: 'Sh',
    scopes: [
      'Read orders',
      'Access products',
      'Read customer data',
    ],
  },
]

// ─── OAuth Dialog Component ──────────────────────────

function OAuthDialog({
  integration,
  open,
  onOpenChange,
  onAuthorize,
}: {
  integration: AvailableIntegration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAuthorize: (id: string) => void
}) {
  const [authorizing, setAuthorizing] = useState(false)

  const handleAuthorize = useCallback(() => {
    if (!integration) return
    setAuthorizing(true)
    // Simulate 2-second OAuth flow
    setTimeout(() => {
      setAuthorizing(false)
      onAuthorize(integration.id)
      onOpenChange(false)
    }, 2000)
  }, [integration, onAuthorize, onOpenChange])

  if (!integration) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: integration.color }}
            >
              {integration.letter}
            </div>
            <div>
              <DialogTitle className="text-slate-100 text-base">
                Connect {integration.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Authorize OpenWorkflow to access your {integration.name} account
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Scopes */}
          <div>
            <p className="text-xs font-medium text-slate-300 mb-2">
              OpenWorkflow requests the following permissions:
            </p>
            <div className="space-y-2">
              {integration.scopes.map((scope) => (
                <div
                  key={scope}
                  className="flex items-center gap-2.5 text-xs text-slate-400"
                >
                  <Shield className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{scope}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security note */}
          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
            <div className="flex items-start gap-2">
              <Plug className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your credentials are encrypted end-to-end. OpenWorkflow only
                accesses data when your AI employees need it. You can revoke
                access at any time.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs"
            onClick={() => onOpenChange(false)}
            disabled={authorizing}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-xs"
            onClick={handleAuthorize}
            disabled={authorizing}
          >
            {authorizing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Authorizing...
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Authorize
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Integrations Page ──────────────────────────

export default function IntegrationsPage() {
  const router = useRouter()
  const [connected, setConnected] = useState<ConnectedIntegration[]>(INITIAL_CONNECTED)
  const [oauthTarget, setOauthTarget] = useState<AvailableIntegration | null>(null)
  const [oauthOpen, setOauthOpen] = useState(false)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const connectedIds = new Set(connected.map((c) => c.id))

  const available = AVAILABLE_INTEGRATIONS.filter(
    (i) => !connectedIds.has(i.id)
  )

  const handleConnect = useCallback((integration: AvailableIntegration) => {
    setOauthTarget(integration)
    setOauthOpen(true)
  }, [])

  const handleAuthorize = useCallback(
    (id: string) => {
      setConnectingId(id)
      const integration = AVAILABLE_INTEGRATIONS.find((i) => i.id === id)
      if (!integration) return

      // Add to connected list
      const newConnected: ConnectedIntegration = {
        id: integration.id,
        name: integration.name,
        color: integration.color,
        letter: integration.letter,
        connectedAgo: 'Just now',
        stat: '0',
        statLabel:
          integration.id === 'gmail' ||
          integration.id === 'outlook' ||
          integration.id === 'postmark'
            ? 'emails sent'
            : 'actions completed',
        workspace: undefined,
      }
      setConnected((prev) => [...prev, newConnected])
      setConnectingId(null)

      toast({
        title: `${integration.name} connected!`,
        description: `Your ${integration.name} integration is now active and ready to use.`,
      })
    },
    []
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ─── Header Bar ──────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => router.push('/')}
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-100">
                OpenWorkflow
              </span>
            </div>

            <nav className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/builder')}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              >
                Builder
              </button>
              <button className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-slate-100">
                Integrations
              </button>
              <button
                onClick={() => router.push('/demo')}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              >
                Demo
              </button>
            </nav>
          </div>

          {/* Right */}
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-xs shadow-lg shadow-cyan-500/20"
            onClick={() => router.push('/builder')}
          >
            <Plug className="h-3.5 w-3.5" />
            New Integration
          </Button>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:text-slate-300 transition-colors"
          >
            Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-300">Integrations</span>
        </div>

        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Integrations</h1>
            <p className="text-sm text-slate-500 mt-1">
              Connect your tools to power your AI employees
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] bg-slate-800 border-slate-700 text-slate-400"
          >
            {connected.length} connected
          </Badge>
        </div>

        {/* ── Connected Section ──────────────────────── */}
        {connected.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-100">Connected</h2>
              <Badge
                variant="outline"
                className="text-[9px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              >
                {connected.length} active
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connected.map((integration) => (
                <Card
                  key={integration.id}
                  className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all duration-200 py-0"
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      {/* Logo */}
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
                        style={{ backgroundColor: integration.color }}
                      >
                        {integration.letter}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-100">
                            {integration.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className="gap-1 text-[9px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Connected
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>Connected {integration.connectedAgo}</span>
                          {integration.workspace && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span>
                                Workspace: {integration.workspace}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-500">
                            {integration.statLabel}:
                          </span>
                          <span className="font-semibold text-slate-200">
                            {integration.stat}
                          </span>
                        </div>
                      </div>

                      {/* Configure Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-800 hover:border-slate-600 shrink-0"
                      >
                        <Settings className="h-3 w-3" />
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Available Section ──────────────────────── */}
        {available.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-bold text-slate-100">Available</h2>
              <Badge
                variant="outline"
                className="text-[10px] bg-slate-800 border-slate-700 text-slate-400"
              >
                {available.length} integrations
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {available.map((integration) => {
                const isConnecting = connectingId === integration.id
                return (
                  <Card
                    key={integration.id}
                    className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all duration-200 py-0"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: integration.color }}
                        >
                          {integration.letter}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-100 truncate">
                            {integration.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-slate-800/50 border-slate-700/50 text-slate-500"
                          >
                            Not connected
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {integration.description}
                      </p>

                      {/* Connect Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs gap-1.5 border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-800 hover:border-slate-600"
                        onClick={() => handleConnect(integration)}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Plug className="h-3 w-3" />
                            Connect
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Empty Connected State ──────────────────── */}
        {connected.length === 0 && (
          <section>
            <Card className="bg-slate-900/50 border-slate-800 py-0">
              <CardContent className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto">
                  <Plug className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-sm text-slate-400">
                  No integrations connected yet. Connect your first tool below
                  to get started.
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
              <Bot className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-[11px] text-slate-500">
              OpenWorkflow — AI Employee Platform
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/builder')}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Builder
            </button>
            <button
              onClick={() => router.push('/integrations')}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Integrations
            </button>
            <button
              onClick={() => router.push('/demo')}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Demo
            </button>
          </div>
        </div>
      </footer>

      {/* ─── OAuth Dialog ────────────────────────────── */}
      <OAuthDialog
        integration={oauthTarget}
        open={oauthOpen}
        onOpenChange={setOauthOpen}
        onAuthorize={handleAuthorize}
      />
    </div>
  )
}
