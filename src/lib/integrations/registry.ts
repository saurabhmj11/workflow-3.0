// ─── OpenWorkflow Integration Layer ───────────────
// Real integration connectors for Gmail, Slack, Zendesk, HubSpot, and more.
// Each integration has: OAuth config, action definitions, and execution handlers.

export type IntegrationStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface IntegrationConfig {
  id: string
  name: string
  description: string
  icon: string
  category: 'email' | 'messaging' | 'crm' | 'support' | 'database'
  authType: 'oauth2' | 'api_key' | 'webhook'
  authUrl?: string
  tokenUrl?: string
  scopes?: string[]
  status: IntegrationStatus
  actions: IntegrationAction[]
}

export interface IntegrationAction {
  id: string
  name: string
  description: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
}

export interface IntegrationCredential {
  integrationId: string
  accessToken?: string
  refreshToken?: string
  apiKey?: string
  expiresAt?: string
  metadata?: Record<string, unknown>
}

// ─── Integration Registry ────────────────────────

export const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send emails, read inbox, manage drafts via Gmail API',
    icon: 'Mail',
    category: 'email',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
    status: 'disconnected',
    actions: [
      {
        id: 'gmail.send',
        name: 'Send Email',
        description: 'Send an email via Gmail',
        method: 'POST',
        path: '/gmail/v1/users/me/messages/send',
        inputSchema: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, threadId: { type: 'string' } },
      },
      {
        id: 'gmail.read',
        name: 'Read Inbox',
        description: 'Read recent emails from inbox',
        method: 'GET',
        path: '/gmail/v1/users/me/messages',
        inputSchema: { maxResults: { type: 'number' }, query: { type: 'string' } },
        outputSchema: { messages: { type: 'array' } },
      },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Post messages, read channels, manage threads via Slack API',
    icon: 'Hash',
    category: 'messaging',
    authType: 'oauth2',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'channels:history'],
    status: 'disconnected',
    actions: [
      {
        id: 'slack.postMessage',
        name: 'Post Message',
        description: 'Post a message to a Slack channel',
        method: 'POST',
        path: 'https://slack.com/api/chat.postMessage',
        inputSchema: { channel: { type: 'string' }, text: { type: 'string' }, threadTs: { type: 'string' } },
        outputSchema: { ok: { type: 'boolean' }, ts: { type: 'string' } },
      },
      {
        id: 'slack.getMessages',
        name: 'Get Channel Messages',
        description: 'Read recent messages from a channel',
        method: 'GET',
        path: 'https://slack.com/api/conversations.history',
        inputSchema: { channel: { type: 'string' }, limit: { type: 'number' } },
        outputSchema: { messages: { type: 'array' }, ok: { type: 'boolean' } },
      },
    ],
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Create tickets, update status, search knowledge base via Zendesk API',
    icon: 'HeadsetHelp',
    category: 'support',
    authType: 'api_key',
    status: 'disconnected',
    actions: [
      {
        id: 'zendesk.createTicket',
        name: 'Create Ticket',
        description: 'Create a new support ticket',
        method: 'POST',
        path: '/api/v2/tickets',
        inputSchema: { subject: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' } },
        outputSchema: { ticket: { type: 'object' } },
      },
      {
        id: 'zendesk.updateTicket',
        name: 'Update Ticket',
        description: 'Update an existing ticket',
        method: 'PUT',
        path: '/api/v2/tickets/{id}',
        inputSchema: { id: { type: 'string' }, status: { type: 'string' }, comment: { type: 'string' } },
        outputSchema: { ticket: { type: 'object' } },
      },
      {
        id: 'zendesk.searchArticles',
        name: 'Search Articles',
        description: 'Search the help center knowledge base',
        method: 'GET',
        path: '/api/v2/help_center/articles/search',
        inputSchema: { query: { type: 'string' }, locale: { type: 'string' } },
        outputSchema: { articles: { type: 'array' } },
      },
    ],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Manage contacts, deals, and companies via HubSpot CRM API',
    icon: 'Database',
    category: 'crm',
    authType: 'oauth2',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.deals.read', 'crm.objects.deals.write'],
    status: 'disconnected',
    actions: [
      {
        id: 'hubspot.createContact',
        name: 'Create Contact',
        description: 'Create a new contact in HubSpot CRM',
        method: 'POST',
        path: 'https://api.hubapi.com/crm/v3/objects/contacts',
        inputSchema: { email: { type: 'string' }, firstname: { type: 'string' }, lastname: { type: 'string' } },
        outputSchema: { id: { type: 'string' } },
      },
      {
        id: 'hubspot.getContact',
        name: 'Get Contact',
        description: 'Retrieve a contact by email or ID',
        method: 'GET',
        path: 'https://api.hubapi.com/crm/v3/objects/contacts/{id}',
        inputSchema: { id: { type: 'string' }, email: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, properties: { type: 'object' } },
      },
      {
        id: 'hubspot.createDeal',
        name: 'Create Deal',
        description: 'Create a new deal in HubSpot CRM',
        method: 'POST',
        path: 'https://api.hubapi.com/crm/v3/objects/deals',
        inputSchema: { dealname: { type: 'string' }, amount: { type: 'string' }, pipeline: { type: 'string' } },
        outputSchema: { id: { type: 'string' } },
      },
    ],
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Send emails, read inbox, manage calendar via Microsoft Graph API',
    icon: 'Mail',
    category: 'email',
    authType: 'oauth2',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['Mail.Send', 'Mail.Read', 'Calendars.Read'],
    status: 'disconnected',
    actions: [
      {
        id: 'outlook.sendMail',
        name: 'Send Email',
        description: 'Send an email via Outlook',
        method: 'POST',
        path: 'https://graph.microsoft.com/v1.0/me/sendMail',
        inputSchema: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } },
        outputSchema: { success: { type: 'boolean' } },
      },
      {
        id: 'outlook.readInbox',
        name: 'Read Inbox',
        description: 'Read recent emails from inbox',
        method: 'GET',
        path: 'https://graph.microsoft.com/v1.0/me/messages',
        inputSchema: { top: { type: 'number' }, filter: { type: 'string' } },
        outputSchema: { value: { type: 'array' } },
      },
    ],
  },
]

// ─── Integration Execution ───────────────────────

export async function executeIntegrationAction(
  integrationId: string,
  actionId: string,
  input: Record<string, unknown>,
  credentials?: IntegrationCredential
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const integration = INTEGRATIONS.find(i => i.id === integrationId)
  if (!integration) {
    return { ok: false, error: `Integration "${integrationId}" not found` }
  }

  const action = integration.actions.find(a => a.id === actionId)
  if (!action) {
    return { ok: false, error: `Action "${actionId}" not found in ${integrationId}` }
  }

  // Check if credentials are available
  if (!credentials?.accessToken && !credentials?.apiKey) {
    // Return simulated response for demo purposes
    return executeSimulatedAction(integrationId, actionId, input)
  }

  // Execute real API call
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (credentials.accessToken) {
      headers['Authorization'] = `Bearer ${credentials.accessToken}`
    } else if (credentials.apiKey) {
      headers['Authorization'] = `Bearer ${credentials.apiKey}`
    }

    let url = action.path
    // Replace path parameters with input values
    for (const [key, value] of Object.entries(input)) {
      url = url.replace(`{${key}}`, String(value))
    }

    const response = await fetch(url, {
      method: action.method,
      headers,
      body: action.method !== 'GET' ? JSON.stringify(input) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { ok: false, error: `${integration.name} API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: `${integration.name} connection failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

// ─── Simulated Actions ──────────────────────────

function executeSimulatedAction(
  integrationId: string,
  actionId: string,
  input: Record<string, unknown>
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      switch (actionId) {
        case 'gmail.send':
          resolve({
            ok: true,
            data: {
              id: `msg-${Date.now()}`,
              threadId: `thread-${Date.now()}`,
              labelIds: ['SENT'],
              to: input.to,
              subject: input.subject,
              sentAt: new Date().toISOString(),
            },
          })
          break
        case 'gmail.read':
          resolve({
            ok: true,
            data: {
              messages: [
                { id: 'msg-1', snippet: 'Customer inquiry about billing...', from: 'customer@example.com' },
                { id: 'msg-2', snippet: 'Follow-up on support ticket #4289', from: 'support@company.com' },
                { id: 'msg-3', snippet: 'Product feedback: love the new feature', from: 'user@example.com' },
              ],
              resultSizeEstimate: 3,
            },
          })
          break
        case 'slack.postMessage':
          resolve({
            ok: true,
            data: {
              ok: true,
              channel: input.channel,
              ts: `${Date.now() / 1000}`,
              message: { text: input.text, user: 'OpenWorkflow Bot' },
            },
          })
          break
        case 'slack.getMessages':
          resolve({
            ok: true,
            data: {
              ok: true,
              messages: [
                { text: 'New ticket assigned to you: #4291', ts: Date.now() / 1000 - 60, user: 'ticket-bot' },
                { text: 'Customer escalation resolved', ts: Date.now() / 1000 - 300, user: 'agent-1' },
              ],
            },
          })
          break
        case 'zendesk.createTicket':
          resolve({
            ok: true,
            data: {
              ticket: {
                id: Math.floor(Math.random() * 100000),
                subject: input.subject,
                description: input.description,
                priority: input.priority ?? 'normal',
                status: 'new',
                created_at: new Date().toISOString(),
              },
            },
          })
          break
        case 'zendesk.updateTicket':
          resolve({
            ok: true,
            data: {
              ticket: {
                id: input.id,
                status: input.status,
                comment: input.comment,
                updated_at: new Date().toISOString(),
              },
            },
          })
          break
        case 'zendesk.searchArticles':
          resolve({
            ok: true,
            data: {
              articles: [
                { id: 101, title: 'How to reset your password', body: 'To reset your password...' },
                { id: 102, title: 'Billing FAQ', body: 'Common billing questions...' },
                { id: 103, title: 'Account settings guide', body: 'Managing your account...' },
              ],
            },
          })
          break
        case 'hubspot.createContact':
          resolve({
            ok: true,
            data: {
              id: `${Date.now()}`,
              properties: { email: input.email, firstname: input.firstname, lastname: input.lastname },
              createdAt: new Date().toISOString(),
            },
          })
          break
        case 'hubspot.getContact':
          resolve({
            ok: true,
            data: {
              id: input.id ?? 'contact-1',
              properties: {
                email: input.email ?? 'john@example.com',
                firstname: 'John',
                lastname: 'Doe',
                company: 'Acme Inc',
                lifecyclestage: 'customer',
              },
            },
          })
          break
        case 'hubspot.createDeal':
          resolve({
            ok: true,
            data: {
              id: `deal-${Date.now()}`,
              properties: { dealname: input.dealname, amount: input.amount },
              createdAt: new Date().toISOString(),
            },
          })
          break
        case 'outlook.sendMail':
          resolve({
            ok: true,
            data: { success: true, sentAt: new Date().toISOString() },
          })
          break
        case 'outlook.readInbox':
          resolve({
            ok: true,
            data: {
              value: [
                { subject: 'Q4 Report', from: { emailAddress: { address: 'cfo@company.com' } } },
                { subject: 'Re: Project update', from: { emailAddress: { address: 'pm@company.com' } } },
              ],
            },
          })
          break
        default:
          resolve({ ok: false, error: `Unknown action: ${actionId}` })
      }
    }, 300 + Math.random() * 500)
  })
}

// ─── Get integration by ID ──────────────────────

export function getIntegration(id: string): IntegrationConfig | undefined {
  return INTEGRATIONS.find(i => i.id === id)
}

// ─── Get action by ID ───────────────────────────

export function getIntegrationAction(integrationId: string, actionId: string): IntegrationAction | undefined {
  const integration = INTEGRATIONS.find(i => i.id === integrationId)
  return integration?.actions.find(a => a.id === actionId)
}
