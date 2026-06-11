'use client'

import { useState, useCallback } from 'react'
import {
  Bot,
  Plug,
  Settings,
  Check,
  Loader2,
  Link2,
  Shield,
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
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: integration.color }}
            >
              {integration.letter}
            </div>
            <div>
              <DialogTitle className="text-zinc-100 text-base">
                Connect {integration.name}
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Authorize OpenWorkflow to access your {integration.name} account
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Scopes */}
          <div>
            <p className="text-xs font-medium text-zinc-300 mb-2">
              OpenWorkflow requests the following permissions:
            </p>
            <div className="space-y-2">
              {integration.scopes.map((scope) => (
                <div
                  key={scope}
                  className="flex items-center gap-2.5 text-xs text-zinc-400"
                >
                  <Shield className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span>{scope}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security note */}
          <div className="rounded-lg bg-zinc-800/50 border border-zinc-700/50 p-3">
            <div className="flex items-start gap-2">
              <Plug className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-zinc-400 leading-relaxed">
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
            className="h-9 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 text-xs"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Integrations</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Connect your tools to power your AI employees
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] bg-zinc-800 border-zinc-700 text-zinc-400"
          >
            {connected.length} connected
          </Badge>
        </div>

        {/* ── Connected Section ──────────────────────── */}
        {connected.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-lg font-bold text-zinc-100">Connected</h2>
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
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-200 py-0"
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
                          <h3 className="text-sm font-semibold text-zinc-100">
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

                        <div className="flex items-center gap-4 text-xs text-zinc-400">
                          <span>Connected {integration.connectedAgo}</span>
                          {integration.workspace && (
                            <>
                              <span className="text-zinc-600">·</span>
                              <span>
                                Workspace: {integration.workspace}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-zinc-500">
                            {integration.statLabel}:
                          </span>
                          <span className="font-semibold text-zinc-200">
                            {integration.stat}
                          </span>
                        </div>
                      </div>

                      {/* Configure Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600 shrink-0"
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
              <Link2 className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-bold text-zinc-100">Available</h2>
              <Badge
                variant="outline"
                className="text-[10px] bg-zinc-800 border-zinc-700 text-zinc-400"
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
                    className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-200 py-0"
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
                          <h3 className="text-sm font-semibold text-zinc-100 truncate">
                            {integration.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-zinc-800/50 border-zinc-700/50 text-zinc-500"
                          >
                            Not connected
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {integration.description}
                      </p>

                      {/* Connect Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs gap-1.5 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600"
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
            <Card className="bg-zinc-900/50 border-zinc-800 py-0">
              <CardContent className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto">
                  <Plug className="h-6 w-6 text-zinc-500" />
                </div>
                <p className="text-sm text-zinc-400">
                  No integrations connected yet. Connect your first tool below
                  to get started.
                </p>
              </CardContent>
            </Card>
          </section>
        )}

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
