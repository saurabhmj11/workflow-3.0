'use client'

import { useState } from 'react'
import { INTEGRATIONS, type IntegrationConfig, type IntegrationStatus, executeIntegrationAction } from '@/lib/integrations/registry'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Mail, Hash, Database, Headphones, Plug,
  Check, X, Loader2, ExternalLink, Settings, Zap,
  type LucideIcon,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const INTEGRATION_ICONS: Record<string, LucideIcon> = {
  Mail, Hash, Database, Headphones, Plug,
}

export function IntegrationPanel() {
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, IntegrationStatus>>(
    Object.fromEntries(INTEGRATIONS.map(i => [i.id, 'disconnected']))
  )
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showConnectDialog, setShowConnectDialog] = useState(false)

  const handleConnect = (integration: IntegrationConfig) => {
    if (integration.authType === 'oauth2') {
      // In production, this would redirect to the OAuth URL
      // For demo, simulate the connection
      setConnectingId(integration.id)
      setTimeout(() => {
        setConnectionStatuses(prev => ({ ...prev, [integration.id]: 'connected' }))
        setConnectingId(null)
        toast({
          title: `${integration.name} Connected`,
          description: `Your ${integration.name} account has been linked successfully.`
        })
      }, 1500)
    } else {
      // API key auth — show the connect dialog
      setSelectedIntegration(integration)
      setShowConnectDialog(true)
    }
  }

  const handleApiKeyConnect = () => {
    if (!selectedIntegration || !apiKeyInput.trim()) return
    setConnectingId(selectedIntegration.id)
    setTimeout(() => {
      setConnectionStatuses(prev => ({ ...prev, [selectedIntegration.id]: 'connected' }))
      setConnectingId(null)
      setShowConnectDialog(false)
      setApiKeyInput('')
      toast({
        title: `${selectedIntegration.name} Connected`,
        description: `Your ${selectedIntegration.name} API key has been validated.`
      })
    }, 1500)
  }

  const handleDisconnect = (integrationId: string) => {
    setConnectionStatuses(prev => ({ ...prev, [integrationId]: 'disconnected' }))
    toast({
      title: 'Disconnected',
      description: `Integration has been removed.`
    })
  }

  const handleTestAction = async (integrationId: string, actionId: string) => {
    setTestingId(actionId)
    try {
      const result = await executeIntegrationAction(integrationId, actionId, {
        to: 'test@example.com',
        subject: 'Test from OpenWorkflow',
        body: 'This is a test message from your AI Employee.',
        channel: '#test-channel',
        text: 'Test message from OpenWorkflow AI Employee',
        query: 'billing',
        subject_ticket: 'Test Ticket',
        description: 'Test ticket from OpenWorkflow',
        priority: 'normal',
      })
      if (result.ok) {
        toast({ title: 'Test Successful', description: `Action "${actionId}" executed successfully (simulated)` })
      } else {
        toast({ title: 'Test Failed', description: result.error, variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Test Error', description: 'Failed to execute test action', variant: 'destructive' })
    } finally {
      setTestingId(null)
    }
  }

  const categoryGroups = {
    email: INTEGRATIONS.filter(i => i.category === 'email'),
    messaging: INTEGRATIONS.filter(i => i.category === 'messaging'),
    support: INTEGRATIONS.filter(i => i.category === 'support'),
    crm: INTEGRATIONS.filter(i => i.category === 'crm'),
  }

  const categoryLabels: Record<string, string> = {
    email: 'Email',
    messaging: 'Messaging',
    support: 'Support',
    crm: 'CRM',
  }

  const statusColors: Record<string, string> = {
    connected: 'border-emerald-500/30 bg-emerald-500/5',
    connecting: 'border-blue-500/30 bg-blue-500/5',
    error: 'border-red-500/30 bg-red-500/5',
    disconnected: 'border-zinc-700 bg-zinc-900/50',
  }

  const statusBadge: Record<string, { variant: 'default' | 'outline' | 'destructive'; label: string }> = {
    connected: { variant: 'default', label: 'Connected' },
    connecting: { variant: 'outline', label: 'Connecting...' },
    error: { variant: 'destructive', label: 'Error' },
    disconnected: { variant: 'outline', label: 'Not Connected' },
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Plug className="h-3 w-3" />
            Integrations
          </h3>
          <Badge variant="outline" className="text-[10px]">
            {Object.values(connectionStatuses).filter(s => s === 'connected').length} / {INTEGRATIONS.length}
          </Badge>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1">Connect your tools in 2 minutes</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {Object.entries(categoryGroups).map(([category, integrations]) => (
            <div key={category}>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2 px-1">
                {categoryLabels[category]}
              </p>
              <div className="space-y-2">
                {integrations.map((integration) => {
                  const Icon = INTEGRATION_ICONS[integration.icon] ?? Plug
                  const status = connectionStatuses[integration.id]
                  const isConnected = status === 'connected'
                  const isConnecting = status === 'connecting' || connectingId === integration.id

                  return (
                    <div
                      key={integration.id}
                      className={`rounded-lg border p-3 transition-colors ${statusColors[status]}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                            isConnected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-800 border border-zinc-700'
                          }`}>
                            <Icon className={`h-4 w-4 ${isConnected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-200">{integration.name}</p>
                            <p className="text-[10px] text-zinc-600 truncate">{integration.description}</p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                          ) : isConnected ? (
                            <div className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 px-1"
                                onClick={() => handleDisconnect(integration.id)}
                              >
                                Disconnect
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] gap-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                              onClick={() => handleConnect(integration)}
                            >
                              <Zap className="h-3 w-3" />
                              Connect
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Actions list when connected */}
                      {isConnected && (
                        <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1">
                          {integration.actions.map((action) => (
                            <div key={action.id} className="flex items-center justify-between py-1">
                              <div className="min-w-0">
                                <p className="text-[10px] text-zinc-300 font-medium">{action.name}</p>
                                <p className="text-[9px] text-zinc-600">{action.description}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[9px] text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 px-1 shrink-0"
                                onClick={() => handleTestAction(integration.id, action.id)}
                                disabled={testingId === action.id}
                              >
                                {testingId === action.id ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                ) : (
                                  'Test'
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* API Key Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm text-zinc-100 flex items-center gap-2">
              <Settings className="h-4 w-4 text-cyan-400" />
              Connect {selectedIntegration?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">API Key / Token</Label>
              <Input
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your API key..."
                type="password"
                className="h-8 text-xs bg-zinc-950 border-zinc-700 text-zinc-200"
              />
              <p className="text-[10px] text-zinc-600">
                Find your API key in {selectedIntegration?.name} Settings → API
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs border-zinc-700 text-zinc-400"
                onClick={() => setShowConnectDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white gap-1"
                onClick={handleApiKeyConnect}
                disabled={!apiKeyInput.trim() || connectingId !== null}
              >
                {connectingId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
