// ─── OpenWorkflow Integration Layer ───────────────
// Real integration connectors for Gmail, Slack, Zendesk, HubSpot, and more.
// Each integration has: OAuth config, action definitions, and execution handlers.

export type IntegrationStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface IntegrationConfig {
  id: string
  name: string
  description: string
  icon: string
  category: 'email' | 'messaging' | 'crm' | 'support' | 'database' | 'payment' | 'project-management' | 'knowledge' | 'commerce'
  authType: 'oauth2' | 'api_key' | 'webhook'
  authUrl?: string
  tokenUrl?: string
  scopes?: string[]
  clientId?: string
  clientSecret?: string
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
  // ─── New Integrations ──────────────────────────
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Send SMS, make voice calls, and lookup phone numbers via Twilio API',
    icon: 'Phone',
    category: 'messaging',
    authType: 'api_key',
    status: 'disconnected',
    actions: [
      {
        id: 'twilio.sendSMS',
        name: 'Send SMS',
        description: 'Send an SMS message to a phone number',
        method: 'POST',
        path: 'https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json',
        inputSchema: { to: { type: 'string' }, from: { type: 'string' }, body: { type: 'string' } },
        outputSchema: { sid: { type: 'string' }, status: { type: 'string' } },
      },
      {
        id: 'twilio.makeCall',
        name: 'Make Call',
        description: 'Initiate an outbound voice call',
        method: 'POST',
        path: 'https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Calls.json',
        inputSchema: { to: { type: 'string' }, from: { type: 'string' }, url: { type: 'string' } },
        outputSchema: { sid: { type: 'string' }, status: { type: 'string' } },
      },
      {
        id: 'twilio.lookupNumber',
        name: 'Lookup Number',
        description: 'Lookup caller information for a phone number',
        method: 'GET',
        path: 'https://lookups.twilio.com/v2/PhoneNumbers/{phoneNumber}',
        inputSchema: { phoneNumber: { type: 'string' }, fields: { type: 'string' } },
        outputSchema: { phoneNumber: { type: 'string' }, callerName: { type: 'string' }, carrier: { type: 'object' } },
      },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments, manage customers, handle subscriptions via Stripe API',
    icon: 'CreditCard',
    category: 'payment',
    authType: 'oauth2',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_write'],
    status: 'disconnected',
    actions: [
      {
        id: 'stripe.createCharge',
        name: 'Create Charge',
        description: 'Create a new charge on a payment source',
        method: 'POST',
        path: 'https://api.stripe.com/v1/charges',
        inputSchema: { amount: { type: 'number' }, currency: { type: 'string' }, source: { type: 'string' }, description: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, amount: { type: 'number' }, status: { type: 'string' } },
      },
      {
        id: 'stripe.createCustomer',
        name: 'Create Customer',
        description: 'Create a new customer in Stripe',
        method: 'POST',
        path: 'https://api.stripe.com/v1/customers',
        inputSchema: { email: { type: 'string' }, name: { type: 'string' }, metadata: { type: 'object' } },
        outputSchema: { id: { type: 'string' }, email: { type: 'string' } },
      },
      {
        id: 'stripe.getInvoice',
        name: 'Get Invoice',
        description: 'Retrieve a specific invoice by ID',
        method: 'GET',
        path: 'https://api.stripe.com/v1/invoices/{id}',
        inputSchema: { id: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, amount_due: { type: 'number' }, status: { type: 'string' } },
      },
      {
        id: 'stripe.listSubscriptions',
        name: 'List Subscriptions',
        description: 'List all subscriptions for the account',
        method: 'GET',
        path: 'https://api.stripe.com/v1/subscriptions',
        inputSchema: { limit: { type: 'number' }, status: { type: 'string' } },
        outputSchema: { data: { type: 'array' }, has_more: { type: 'boolean' } },
      },
      {
        id: 'stripe.refundCharge',
        name: 'Refund Charge',
        description: 'Refund a previously created charge',
        method: 'POST',
        path: 'https://api.stripe.com/v1/refunds',
        inputSchema: { charge: { type: 'string' }, amount: { type: 'number' }, reason: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, amount: { type: 'number' }, status: { type: 'string' } },
      },
    ],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Manage leads, contacts, and opportunities via Salesforce CRM API',
    icon: 'Cloud',
    category: 'crm',
    authType: 'oauth2',
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token'],
    status: 'disconnected',
    actions: [
      {
        id: 'salesforce.createLead',
        name: 'Create Lead',
        description: 'Create a new lead in Salesforce',
        method: 'POST',
        path: 'https://yourinstance.salesforce.com/services/data/v58.0/sobjects/Lead',
        inputSchema: { FirstName: { type: 'string' }, LastName: { type: 'string' }, Company: { type: 'string' }, Email: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, success: { type: 'boolean' } },
      },
      {
        id: 'salesforce.getContact',
        name: 'Get Contact',
        description: 'Retrieve a contact by ID',
        method: 'GET',
        path: 'https://yourinstance.salesforce.com/services/data/v58.0/sobjects/Contact/{id}',
        inputSchema: { id: { type: 'string' } },
        outputSchema: { Id: { type: 'string' }, Name: { type: 'string' }, Email: { type: 'string' } },
      },
      {
        id: 'salesforce.updateOpportunity',
        name: 'Update Opportunity',
        description: 'Update an existing opportunity record',
        method: 'PUT',
        path: 'https://yourinstance.salesforce.com/services/data/v58.0/sobjects/Opportunity/{id}',
        inputSchema: { id: { type: 'string' }, StageName: { type: 'string' }, Amount: { type: 'number' }, CloseDate: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, success: { type: 'boolean' } },
      },
      {
        id: 'salesforce.searchRecords',
        name: 'Search Records',
        description: 'Execute a SOSL search across Salesforce objects',
        method: 'GET',
        path: 'https://yourinstance.salesforce.com/services/data/v58.0/search',
        inputSchema: { q: { type: 'string' } },
        outputSchema: { searchRecords: { type: 'array' } },
      },
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Create pages, search content, and manage databases via Notion API',
    icon: 'BookOpen',
    category: 'knowledge',
    authType: 'oauth2',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: ['read_content', 'write_content'],
    status: 'disconnected',
    actions: [
      {
        id: 'notion.createPage',
        name: 'Create Page',
        description: 'Create a new page in Notion',
        method: 'POST',
        path: 'https://api.notion.com/v1/pages',
        inputSchema: { parent: { type: 'object' }, title: { type: 'string' }, content: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, url: { type: 'string' } },
      },
      {
        id: 'notion.searchPages',
        name: 'Search Pages',
        description: 'Search for pages and databases in Notion',
        method: 'POST',
        path: 'https://api.notion.com/v1/search',
        inputSchema: { query: { type: 'string' }, filter: { type: 'object' } },
        outputSchema: { results: { type: 'array' }, has_more: { type: 'boolean' } },
      },
      {
        id: 'notion.updatePage',
        name: 'Update Page',
        description: 'Update an existing Notion page',
        method: 'PUT',
        path: 'https://api.notion.com/v1/pages/{id}',
        inputSchema: { id: { type: 'string' }, properties: { type: 'object' }, archived: { type: 'boolean' } },
        outputSchema: { id: { type: 'string' }, updated_at: { type: 'string' } },
      },
      {
        id: 'notion.getDatabase',
        name: 'Get Database',
        description: 'Retrieve a database by ID',
        method: 'GET',
        path: 'https://api.notion.com/v1/databases/{id}',
        inputSchema: { id: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, title: { type: 'array' }, properties: { type: 'object' } },
      },
    ],
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Read and write records, manage bases via Airtable API',
    icon: 'Table',
    category: 'database',
    authType: 'oauth2',
    authUrl: 'https://airtable.com/oauth2/v1/authorize',
    tokenUrl: 'https://airtable.com/oauth2/v1/token',
    scopes: ['data.records:read', 'data.records:write', 'schema.bases:read'],
    status: 'disconnected',
    actions: [
      {
        id: 'airtable.listRecords',
        name: 'List Records',
        description: 'List records from an Airtable table',
        method: 'GET',
        path: 'https://api.airtable.com/v0/{baseId}/{tableId}',
        inputSchema: { baseId: { type: 'string' }, tableId: { type: 'string' }, maxRecords: { type: 'number' }, filterByFormula: { type: 'string' } },
        outputSchema: { records: { type: 'array' }, offset: { type: 'string' } },
      },
      {
        id: 'airtable.createRecord',
        name: 'Create Record',
        description: 'Create a new record in an Airtable table',
        method: 'POST',
        path: 'https://api.airtable.com/v0/{baseId}/{tableId}',
        inputSchema: { baseId: { type: 'string' }, tableId: { type: 'string' }, fields: { type: 'object' } },
        outputSchema: { id: { type: 'string' }, fields: { type: 'object' } },
      },
      {
        id: 'airtable.updateRecord',
        name: 'Update Record',
        description: 'Update an existing record in an Airtable table',
        method: 'PUT',
        path: 'https://api.airtable.com/v0/{baseId}/{tableId}/{recordId}',
        inputSchema: { baseId: { type: 'string' }, tableId: { type: 'string' }, recordId: { type: 'string' }, fields: { type: 'object' } },
        outputSchema: { id: { type: 'string' }, fields: { type: 'object' } },
      },
      {
        id: 'airtable.getBase',
        name: 'Get Base',
        description: 'Retrieve metadata for an Airtable base',
        method: 'GET',
        path: 'https://api.airtable.com/v0/meta/bases/{baseId}',
        inputSchema: { baseId: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, name: { type: 'string' }, tables: { type: 'array' } },
      },
    ],
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Read and write spreadsheet data, create sheets via Google Sheets API',
    icon: 'Sheet',
    category: 'database',
    authType: 'oauth2',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
    status: 'disconnected',
    actions: [
      {
        id: 'google-sheets.readSheet',
        name: 'Read Sheet',
        description: 'Read data from a Google Sheets spreadsheet',
        method: 'GET',
        path: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}',
        inputSchema: { spreadsheetId: { type: 'string' }, range: { type: 'string' } },
        outputSchema: { range: { type: 'string' }, values: { type: 'array' } },
      },
      {
        id: 'google-sheets.appendRows',
        name: 'Append Rows',
        description: 'Append rows of data to a spreadsheet',
        method: 'POST',
        path: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}:append',
        inputSchema: { spreadsheetId: { type: 'string' }, range: { type: 'string' }, values: { type: 'array' } },
        outputSchema: { updates: { type: 'object' } },
      },
      {
        id: 'google-sheets.updateCell',
        name: 'Update Cell',
        description: 'Update specific cells in a spreadsheet',
        method: 'PUT',
        path: 'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}',
        inputSchema: { spreadsheetId: { type: 'string' }, range: { type: 'string' }, values: { type: 'array' } },
        outputSchema: { updatedCells: { type: 'number' }, updatedRange: { type: 'string' } },
      },
      {
        id: 'google-sheets.createSheet',
        name: 'Create Sheet',
        description: 'Create a new spreadsheet',
        method: 'POST',
        path: 'https://sheets.googleapis.com/v4/spreadsheets',
        inputSchema: { title: { type: 'string' }, properties: { type: 'object' } },
        outputSchema: { spreadsheetId: { type: 'string' }, spreadsheetUrl: { type: 'string' } },
      },
    ],
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Create issues, track progress, manage projects via Jira API',
    icon: 'ClipboardList',
    category: 'project-management',
    authType: 'oauth2',
    authUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    scopes: ['read:jira-work', 'write:jira-work', 'offline_access'],
    status: 'disconnected',
    actions: [
      {
        id: 'jira.createIssue',
        name: 'Create Issue',
        description: 'Create a new issue in a Jira project',
        method: 'POST',
        path: 'https://yourdomain.atlassian.net/rest/api/3/issue',
        inputSchema: { project: { type: 'string' }, summary: { type: 'string' }, description: { type: 'string' }, issuetype: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, key: { type: 'string' }, self: { type: 'string' } },
      },
      {
        id: 'jira.updateIssue',
        name: 'Update Issue',
        description: 'Update an existing Jira issue',
        method: 'PUT',
        path: 'https://yourdomain.atlassian.net/rest/api/3/issue/{issueIdOrKey}',
        inputSchema: { issueIdOrKey: { type: 'string' }, summary: { type: 'string' }, status: { type: 'string' }, assignee: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, key: { type: 'string' } },
      },
      {
        id: 'jira.searchIssues',
        name: 'Search Issues',
        description: 'Search for issues using JQL',
        method: 'GET',
        path: 'https://yourdomain.atlassian.net/rest/api/3/search',
        inputSchema: { jql: { type: 'string' }, maxResults: { type: 'number' }, fields: { type: 'string' } },
        outputSchema: { issues: { type: 'array' }, total: { type: 'number' } },
      },
      {
        id: 'jira.addComment',
        name: 'Add Comment',
        description: 'Add a comment to an existing issue',
        method: 'POST',
        path: 'https://yourdomain.atlassian.net/rest/api/3/issue/{issueIdOrKey}/comment',
        inputSchema: { issueIdOrKey: { type: 'string' }, body: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, created: { type: 'string' } },
      },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repos, issues, and pull requests via GitHub API',
    icon: 'GitBranch',
    category: 'project-management',
    authType: 'oauth2',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:org'],
    status: 'disconnected',
    actions: [
      {
        id: 'github.createIssue',
        name: 'Create Issue',
        description: 'Create a new issue in a GitHub repository',
        method: 'POST',
        path: 'https://api.github.com/repos/{owner}/{repo}/issues',
        inputSchema: { owner: { type: 'string' }, repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' }, labels: { type: 'array' } },
        outputSchema: { id: { type: 'number' }, number: { type: 'number' }, html_url: { type: 'string' } },
      },
      {
        id: 'github.listRepos',
        name: 'List Repos',
        description: 'List repositories for the authenticated user',
        method: 'GET',
        path: 'https://api.github.com/user/repos',
        inputSchema: { visibility: { type: 'string' }, per_page: { type: 'number' }, sort: { type: 'string' } },
        outputSchema: { repos: { type: 'array' }, total_count: { type: 'number' } },
      },
      {
        id: 'github.getPullRequest',
        name: 'Get Pull Request',
        description: 'Retrieve a specific pull request',
        method: 'GET',
        path: 'https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}',
        inputSchema: { owner: { type: 'string' }, repo: { type: 'string' }, pull_number: { type: 'number' } },
        outputSchema: { id: { type: 'number' }, number: { type: 'number' }, title: { type: 'string' }, state: { type: 'string' } },
      },
      {
        id: 'github.createWebhook',
        name: 'Create Webhook',
        description: 'Create a repository webhook',
        method: 'POST',
        path: 'https://api.github.com/repos/{owner}/{repo}/hooks',
        inputSchema: { owner: { type: 'string' }, repo: { type: 'string' }, events: { type: 'array' }, config: { type: 'object' } },
        outputSchema: { id: { type: 'number' }, url: { type: 'string' }, active: { type: 'boolean' } },
      },
    ],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Manage orders, products, and inventory via Shopify Admin API',
    icon: 'ShoppingCart',
    category: 'commerce',
    authType: 'oauth2',
    authUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
    tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
    scopes: ['read_orders', 'write_orders', 'read_products', 'write_products', 'read_inventory'],
    status: 'disconnected',
    actions: [
      {
        id: 'shopify.getOrders',
        name: 'Get Orders',
        description: 'Retrieve orders from the Shopify store',
        method: 'GET',
        path: 'https://{shop}.myshopify.com/admin/api/2024-01/orders.json',
        inputSchema: { shop: { type: 'string' }, status: { type: 'string' }, limit: { type: 'number' } },
        outputSchema: { orders: { type: 'array' } },
      },
      {
        id: 'shopify.createProduct',
        name: 'Create Product',
        description: 'Create a new product in the Shopify store',
        method: 'POST',
        path: 'https://{shop}.myshopify.com/admin/api/2024-01/products.json',
        inputSchema: { shop: { type: 'string' }, title: { type: 'string' }, body_html: { type: 'string' }, vendor: { type: 'string' }, variants: { type: 'array' } },
        outputSchema: { product: { type: 'object' } },
      },
      {
        id: 'shopify.updateInventory',
        name: 'Update Inventory',
        description: 'Update inventory levels for a product',
        method: 'POST',
        path: 'https://{shop}.myshopify.com/admin/api/2024-01/inventory_levels/set.json',
        inputSchema: { shop: { type: 'string' }, inventory_item_id: { type: 'number' }, location_id: { type: 'number' }, available: { type: 'number' } },
        outputSchema: { inventory_level: { type: 'object' } },
      },
      {
        id: 'shopify.getCustomer',
        name: 'Get Customer',
        description: 'Retrieve a customer by ID',
        method: 'GET',
        path: 'https://{shop}.myshopify.com/admin/api/2024-01/customers/{id}.json',
        inputSchema: { shop: { type: 'string' }, id: { type: 'string' } },
        outputSchema: { customer: { type: 'object' } },
      },
    ],
  },
  {
    id: 'intercom',
    name: 'Intercom',
    description: 'Manage contacts, conversations, and customer messaging via Intercom API',
    icon: 'MessageSquare',
    category: 'support',
    authType: 'oauth2',
    authUrl: 'https://app.intercom.com/oauth',
    tokenUrl: 'https://api.intercom.io/auth/evoke_token/1.0',
    scopes: ['user', 'conversation'],
    status: 'disconnected',
    actions: [
      {
        id: 'intercom.createContact',
        name: 'Create Contact',
        description: 'Create a new contact in Intercom',
        method: 'POST',
        path: 'https://api.intercom.io/contacts',
        inputSchema: { email: { type: 'string' }, name: { type: 'string' }, phone: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, email: { type: 'string' }, created_at: { type: 'number' } },
      },
      {
        id: 'intercom.sendMessage',
        name: 'Send Message',
        description: 'Send a message to a contact',
        method: 'POST',
        path: 'https://api.intercom.io/messages',
        inputSchema: { message_type: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, from: { type: 'object' }, to: { type: 'object' } },
        outputSchema: { id: { type: 'string' }, created_at: { type: 'number' } },
      },
      {
        id: 'intercom.listConversations',
        name: 'List Conversations',
        description: 'List conversations for a contact or inbox',
        method: 'GET',
        path: 'https://api.intercom.io/conversations',
        inputSchema: { contact_id: { type: 'string' }, limit: { type: 'number' } },
        outputSchema: { conversations: { type: 'array' }, total_count: { type: 'number' } },
      },
      {
        id: 'intercom.addNote',
        name: 'Add Note',
        description: 'Add a note to a contact',
        method: 'POST',
        path: 'https://api.intercom.io/contacts/{id}/notes',
        inputSchema: { id: { type: 'string' }, body: { type: 'string' } },
        outputSchema: { id: { type: 'string' }, created_at: { type: 'number' } },
      },
    ],
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Execute queries, inspect schema, and manage data via PostgreSQL connection',
    icon: 'Database',
    category: 'database',
    authType: 'api_key',
    status: 'disconnected',
    actions: [
      {
        id: 'postgresql.executeQuery',
        name: 'Execute Query',
        description: 'Execute a SQL query against the database',
        method: 'POST',
        path: '/api/postgresql/query',
        inputSchema: { query: { type: 'string' }, params: { type: 'array' } },
        outputSchema: { rows: { type: 'array' }, rowCount: { type: 'number' } },
      },
      {
        id: 'postgresql.listTables',
        name: 'List Tables',
        description: 'List all tables in the database',
        method: 'GET',
        path: '/api/postgresql/tables',
        inputSchema: { schema: { type: 'string' } },
        outputSchema: { tables: { type: 'array' } },
      },
      {
        id: 'postgresql.describeTable',
        name: 'Describe Table',
        description: 'Get column details for a specific table',
        method: 'GET',
        path: '/api/postgresql/tables/{tableName}/columns',
        inputSchema: { tableName: { type: 'string' }, schema: { type: 'string' } },
        outputSchema: { columns: { type: 'array' } },
      },
      {
        id: 'postgresql.insertRow',
        name: 'Insert Row',
        description: 'Insert a new row into a table',
        method: 'POST',
        path: '/api/postgresql/tables/{tableName}/rows',
        inputSchema: { tableName: { type: 'string' }, data: { type: 'object' }, schema: { type: 'string' } },
        outputSchema: { inserted: { type: 'number' }, row: { type: 'object' } },
      },
    ],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Send emails, manage contact lists, and track delivery via SendGrid API',
    icon: 'Send',
    category: 'email',
    authType: 'api_key',
    status: 'disconnected',
    actions: [
      {
        id: 'sendgrid.sendEmail',
        name: 'Send Email',
        description: 'Send an email via SendGrid',
        method: 'POST',
        path: 'https://api.sendgrid.com/v3/mail/send',
        inputSchema: { to: { type: 'string' }, from: { type: 'string' }, subject: { type: 'string' }, html: { type: 'string' } },
        outputSchema: { success: { type: 'boolean' }, messageId: { type: 'string' } },
      },
      {
        id: 'sendgrid.addContactToList',
        name: 'Add Contact to List',
        description: 'Add a contact to a SendGrid mailing list',
        method: 'POST',
        path: 'https://api.sendgrid.com/v3/marketing/lists/{id}/contacts',
        inputSchema: { id: { type: 'string' }, email: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' } },
        outputSchema: { job_id: { type: 'string' } },
      },
      {
        id: 'sendgrid.getDeliveryStats',
        name: 'Get Delivery Stats',
        description: 'Retrieve email delivery statistics',
        method: 'GET',
        path: 'https://api.sendgrid.com/v3/stats',
        inputSchema: { start_date: { type: 'string' }, end_date: { type: 'string' }, aggregated_by: { type: 'string' } },
        outputSchema: { stats: { type: 'array' } },
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
        // ─── Gmail ───────────────────────────────
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

        // ─── Slack ───────────────────────────────
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

        // ─── Zendesk ─────────────────────────────
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

        // ─── HubSpot ─────────────────────────────
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

        // ─── Outlook ─────────────────────────────
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

        // ─── Twilio ──────────────────────────────
        case 'twilio.sendSMS':
          resolve({
            ok: true,
            data: {
              sid: `SM${Date.now()}`,
              to: input.to,
              from: input.from,
              body: input.body,
              status: 'queued',
              date_sent: new Date().toISOString(),
            },
          })
          break
        case 'twilio.makeCall':
          resolve({
            ok: true,
            data: {
              sid: `CA${Date.now()}`,
              to: input.to,
              from: input.from,
              status: 'ringing',
              start_time: new Date().toISOString(),
            },
          })
          break
        case 'twilio.lookupNumber':
          resolve({
            ok: true,
            data: {
              phoneNumber: input.phoneNumber,
              callerName: 'John Doe',
              carrier: { name: 'Verizon Wireless', type: 'mobile', mobile_country_code: '310', mobile_network_code: '004' },
              valid: true,
            },
          })
          break

        // ─── Stripe ──────────────────────────────
        case 'stripe.createCharge':
          resolve({
            ok: true,
            data: {
              id: `ch_${Date.now()}`,
              amount: input.amount,
              currency: input.currency ?? 'usd',
              status: 'succeeded',
              description: input.description,
              created: Math.floor(Date.now() / 1000),
            },
          })
          break
        case 'stripe.createCustomer':
          resolve({
            ok: true,
            data: {
              id: `cus_${Date.now()}`,
              email: input.email,
              name: input.name,
              object: 'customer',
              created: Math.floor(Date.now() / 1000),
            },
          })
          break
        case 'stripe.getInvoice':
          resolve({
            ok: true,
            data: {
              id: input.id ?? `in_${Date.now()}`,
              amount_due: 9900,
              currency: 'usd',
              status: 'paid',
              customer: `cus_${Date.now()}`,
              period_start: Math.floor(Date.now() / 1000) - 2592000,
              period_end: Math.floor(Date.now() / 1000),
            },
          })
          break
        case 'stripe.listSubscriptions':
          resolve({
            ok: true,
            data: {
              data: [
                { id: 'sub_1', status: 'active', plan: { amount: 2900, interval: 'month' }, current_period_end: Math.floor(Date.now() / 1000) + 2592000 },
                { id: 'sub_2', status: 'active', plan: { amount: 9900, interval: 'year' }, current_period_end: Math.floor(Date.now() / 1000) + 31536000 },
                { id: 'sub_3', status: 'past_due', plan: { amount: 4900, interval: 'month' }, current_period_end: Math.floor(Date.now() / 1000) - 86400 },
              ],
              has_more: false,
            },
          })
          break
        case 'stripe.refundCharge':
          resolve({
            ok: true,
            data: {
              id: `re_${Date.now()}`,
              charge: input.charge,
              amount: input.amount,
              reason: input.reason ?? 'requested_by_customer',
              status: 'succeeded',
              created: Math.floor(Date.now() / 1000),
            },
          })
          break

        // ─── Salesforce ──────────────────────────
        case 'salesforce.createLead':
          resolve({
            ok: true,
            data: {
              id: `00Q${Date.now()}`,
              success: true,
              errors: [],
              FirstName: input.FirstName,
              LastName: input.LastName,
              Company: input.Company,
            },
          })
          break
        case 'salesforce.getContact':
          resolve({
            ok: true,
            data: {
              Id: input.id ?? '0031234567890',
              Name: 'Jane Smith',
              Email: 'jane.smith@acme.com',
              Phone: '+1-555-0123',
              Account: { Name: 'Acme Corp' },
            },
          })
          break
        case 'salesforce.updateOpportunity':
          resolve({
            ok: true,
            data: {
              id: input.id ?? `006${Date.now()}`,
              success: true,
              errors: [],
              StageName: input.StageName,
              Amount: input.Amount,
            },
          })
          break
        case 'salesforce.searchRecords':
          resolve({
            ok: true,
            data: {
              searchRecords: [
                { attributes: { type: 'Contact' }, Id: '0031', Name: 'Alice Johnson' },
                { attributes: { type: 'Lead' }, Id: '00Q1', Name: 'Bob Williams' },
                { attributes: { type: 'Account' }, Id: '0011', Name: 'Acme Corp' },
              ],
              total: 3,
            },
          })
          break

        // ─── Notion ──────────────────────────────
        case 'notion.createPage':
          resolve({
            ok: true,
            data: {
              id: `page-${Date.now()}`,
              object: 'page',
              url: `https://notion.so/${Date.now()}`,
              created_time: new Date().toISOString(),
              title: input.title,
            },
          })
          break
        case 'notion.searchPages':
          resolve({
            ok: true,
            data: {
              results: [
                { id: 'page-1', object: 'page', title: [{ plain_text: 'Project Roadmap' }], last_edited_time: new Date().toISOString() },
                { id: 'page-2', object: 'page', title: [{ plain_text: 'Meeting Notes' }], last_edited_time: new Date().toISOString() },
                { id: 'db-1', object: 'database', title: [{ plain_text: 'Task Tracker' }] },
              ],
              has_more: false,
            },
          })
          break
        case 'notion.updatePage':
          resolve({
            ok: true,
            data: {
              id: input.id ?? `page-${Date.now()}`,
              object: 'page',
              updated_at: new Date().toISOString(),
              archived: input.archived ?? false,
            },
          })
          break
        case 'notion.getDatabase':
          resolve({
            ok: true,
            data: {
              id: input.id ?? 'db-1',
              object: 'database',
              title: [{ plain_text: 'Task Tracker' }],
              properties: {
                Name: { type: 'title' },
                Status: { type: 'select', select: { options: [{ name: 'To Do' }, { name: 'In Progress' }, { name: 'Done' }] } },
                Priority: { type: 'select', select: { options: [{ name: 'High' }, { name: 'Medium' }, { name: 'Low' }] } },
              },
            },
          })
          break

        // ─── Airtable ────────────────────────────
        case 'airtable.listRecords':
          resolve({
            ok: true,
            data: {
              records: [
                { id: 'rec1', fields: { Name: 'Project Alpha', Status: 'Active', Owner: 'Alice' }, createdTime: new Date().toISOString() },
                { id: 'rec2', fields: { Name: 'Project Beta', Status: 'Planning', Owner: 'Bob' }, createdTime: new Date().toISOString() },
                { id: 'rec3', fields: { Name: 'Project Gamma', Status: 'Completed', Owner: 'Carol' }, createdTime: new Date().toISOString() },
              ],
              offset: 'itrrec3',
            },
          })
          break
        case 'airtable.createRecord':
          resolve({
            ok: true,
            data: {
              id: `rec${Date.now()}`,
              fields: input.fields ?? {},
              createdTime: new Date().toISOString(),
            },
          })
          break
        case 'airtable.updateRecord':
          resolve({
            ok: true,
            data: {
              id: input.recordId ?? `rec${Date.now()}`,
              fields: input.fields ?? {},
              createdTime: new Date().toISOString(),
            },
          })
          break
        case 'airtable.getBase':
          resolve({
            ok: true,
            data: {
              id: input.baseId ?? 'app1',
              name: 'Marketing Base',
              tables: [
                { id: 'tbl1', name: 'Campaigns', primaryFieldId: 'fld1' },
                { id: 'tbl2', name: 'Leads', primaryFieldId: 'fld2' },
                { id: 'tbl3', name: 'Analytics', primaryFieldId: 'fld3' },
              ],
            },
          })
          break

        // ─── Google Sheets ───────────────────────
        case 'google-sheets.readSheet':
          resolve({
            ok: true,
            data: {
              range: input.range ?? 'Sheet1!A1:D10',
              values: [
                ['Name', 'Email', 'Status', 'Score'],
                ['Alice Johnson', 'alice@acme.com', 'Active', '95'],
                ['Bob Smith', 'bob@acme.com', 'Pending', '78'],
                ['Carol White', 'carol@acme.com', 'Active', '88'],
              ],
            },
          })
          break
        case 'google-sheets.appendRows':
          resolve({
            ok: true,
            data: {
              updates: {
                updatedRange: 'Sheet1!A5:D6',
                updatedRows: 2,
                updatedCells: 8,
              },
            },
          })
          break
        case 'google-sheets.updateCell':
          resolve({
            ok: true,
            data: {
              updatedCells: 1,
              updatedRows: 1,
              updatedRange: input.range ?? 'Sheet1!B2',
            },
          })
          break
        case 'google-sheets.createSheet':
          resolve({
            ok: true,
            data: {
              spreadsheetId: `1spx${Date.now()}`,
              spreadsheetUrl: `https://docs.google.com/spreadsheets/d/1spx${Date.now()}/edit`,
              title: input.title ?? 'New Spreadsheet',
            },
          })
          break

        // ─── Jira ────────────────────────────────
        case 'jira.createIssue':
          resolve({
            ok: true,
            data: {
              id: `${Date.now()}`,
              key: `PROJ-${Math.floor(Math.random() * 9999)}`,
              self: `https://yourdomain.atlassian.net/rest/api/3/issue/${Date.now()}`,
              summary: input.summary,
              issuetype: input.issuetype ?? 'Task',
            },
          })
          break
        case 'jira.updateIssue':
          resolve({
            ok: true,
            data: {
              id: `${Date.now()}`,
              key: input.issueIdOrKey ?? 'PROJ-1234',
              summary: input.summary,
              status: input.status ?? 'In Progress',
            },
          })
          break
        case 'jira.searchIssues':
          resolve({
            ok: true,
            data: {
              issues: [
                { id: '1', key: 'PROJ-101', fields: { summary: 'Fix login bug', status: { name: 'In Progress' }, priority: { name: 'High' } } },
                { id: '2', key: 'PROJ-102', fields: { summary: 'Add export feature', status: { name: 'To Do' }, priority: { name: 'Medium' } } },
                { id: '3', key: 'PROJ-103', fields: { summary: 'Update documentation', status: { name: 'Done' }, priority: { name: 'Low' } } },
              ],
              total: 3,
            },
          })
          break
        case 'jira.addComment':
          resolve({
            ok: true,
            data: {
              id: `${Date.now()}`,
              body: input.body,
              created: new Date().toISOString(),
              author: { displayName: 'OpenWorkflow Bot' },
            },
          })
          break

        // ─── GitHub ──────────────────────────────
        case 'github.createIssue':
          resolve({
            ok: true,
            data: {
              id: Math.floor(Math.random() * 1000000),
              number: Math.floor(Math.random() * 9999),
              title: input.title,
              body: input.body,
              html_url: `https://github.com/${input.owner}/${input.repo}/issues/${Math.floor(Math.random() * 9999)}`,
              state: 'open',
              created_at: new Date().toISOString(),
            },
          })
          break
        case 'github.listRepos':
          resolve({
            ok: true,
            data: {
              repos: [
                { id: 1, name: 'api-service', full_name: 'acme/api-service', private: false, language: 'TypeScript', stargazers_count: 42 },
                { id: 2, name: 'web-app', full_name: 'acme/web-app', private: true, language: 'TypeScript', stargazers_count: 18 },
                { id: 3, name: 'infrastructure', full_name: 'acme/infrastructure', private: true, language: 'HCL', stargazers_count: 7 },
              ],
              total_count: 3,
            },
          })
          break
        case 'github.getPullRequest':
          resolve({
            ok: true,
            data: {
              id: Math.floor(Math.random() * 1000000),
              number: input.pull_number ?? 42,
              title: 'feat: add workflow automation engine',
              state: 'open',
              user: { login: 'developer' },
              merged: false,
              additions: 342,
              deletions: 89,
              created_at: new Date().toISOString(),
            },
          })
          break
        case 'github.createWebhook':
          resolve({
            ok: true,
            data: {
              id: Math.floor(Math.random() * 1000000),
              url: (input.config as Record<string, unknown>)?.url ?? 'https://openworkflow.io/webhook/github',
              active: true,
              events: input.events ?? ['push', 'pull_request'],
              created_at: new Date().toISOString(),
            },
          })
          break

        // ─── Shopify ─────────────────────────────
        case 'shopify.getOrders':
          resolve({
            ok: true,
            data: {
              orders: [
                { id: 1001, order_number: '#1001', total_price: '149.99', financial_status: 'paid', created_at: new Date().toISOString() },
                { id: 1002, order_number: '#1002', total_price: '79.00', financial_status: 'pending', created_at: new Date().toISOString() },
                { id: 1003, order_number: '#1003', total_price: '249.50', financial_status: 'refunded', created_at: new Date().toISOString() },
              ],
            },
          })
          break
        case 'shopify.createProduct':
          resolve({
            ok: true,
            data: {
              product: {
                id: Math.floor(Math.random() * 1000000),
                title: input.title,
                vendor: input.vendor ?? 'OpenWorkflow Store',
                status: 'draft',
                created_at: new Date().toISOString(),
                variants: [{ id: 1, price: '29.99', inventory_quantity: 100 }],
              },
            },
          })
          break
        case 'shopify.updateInventory':
          resolve({
            ok: true,
            data: {
              inventory_level: {
                inventory_item_id: input.inventory_item_id ?? 1,
                location_id: input.location_id ?? 1,
                available: input.available ?? 50,
                updated_at: new Date().toISOString(),
              },
            },
          })
          break
        case 'shopify.getCustomer':
          resolve({
            ok: true,
            data: {
              customer: {
                id: input.id ?? 'cust-1',
                email: 'customer@example.com',
                first_name: 'Sarah',
                last_name: 'Connor',
                orders_count: 12,
                total_spent: '1549.88',
                created_at: new Date().toISOString(),
              },
            },
          })
          break

        // ─── Intercom ────────────────────────────
        case 'intercom.createContact':
          resolve({
            ok: true,
            data: {
              id: `${Date.now()}`,
              email: input.email,
              name: input.name,
              phone: input.phone ?? '',
              created_at: Math.floor(Date.now() / 1000),
              role: 'user',
            },
          })
          break
        case 'intercom.sendMessage':
          resolve({
            ok: true,
            data: {
              id: `${Date.now()}`,
              message_type: input.message_type ?? 'inapp',
              subject: input.subject,
              body: input.body,
              created_at: Math.floor(Date.now() / 1000),
            },
          })
          break
        case 'intercom.listConversations':
          resolve({
            ok: true,
            data: {
              conversations: [
                { id: 'conv-1', created_at: Math.floor(Date.now() / 1000) - 3600, state: 'open', source: { type: 'user' } },
                { id: 'conv-2', created_at: Math.floor(Date.now() / 1000) - 7200, state: 'closed', source: { type: 'user' } },
                { id: 'conv-3', created_at: Math.floor(Date.now() / 1000) - 1800, state: 'open', source: { type: 'contact' } },
              ],
              total_count: 3,
            },
          })
          break
        case 'intercom.addNote':
          resolve({
            ok: true,
            data: {
              id: `${Date.now()}`,
              body: input.body,
              created_at: Math.floor(Date.now() / 1000),
              author: { id: 'admin-1', type: 'admin' },
            },
          })
          break

        // ─── PostgreSQL ──────────────────────────
        case 'postgresql.executeQuery':
          resolve({
            ok: true,
            data: {
              rows: [
                { id: 1, name: 'Alice Johnson', email: 'alice@acme.com', created_at: '2024-01-15' },
                { id: 2, name: 'Bob Smith', email: 'bob@acme.com', created_at: '2024-02-20' },
                { id: 3, name: 'Carol White', email: 'carol@acme.com', created_at: '2024-03-10' },
              ],
              rowCount: 3,
              command: 'SELECT',
            },
          })
          break
        case 'postgresql.listTables':
          resolve({
            ok: true,
            data: {
              tables: [
                { table_name: 'users', table_type: 'BASE TABLE', row_count: 15234 },
                { table_name: 'orders', table_type: 'BASE TABLE', row_count: 89421 },
                { table_name: 'products', table_type: 'BASE TABLE', row_count: 342 },
                { table_name: 'audit_log', table_type: 'BASE TABLE', row_count: 234100 },
              ],
            },
          })
          break
        case 'postgresql.describeTable':
          resolve({
            ok: true,
            data: {
              columns: [
                { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
                { column_name: 'email', data_type: 'varchar(255)', is_nullable: 'NO', column_default: null },
                { column_name: 'name', data_type: 'varchar(255)', is_nullable: 'YES', column_default: null },
                { column_name: 'created_at', data_type: 'timestamptz', is_nullable: 'NO', column_default: 'now()' },
              ],
            },
          })
          break
        case 'postgresql.insertRow':
          resolve({
            ok: true,
            data: {
              inserted: 1,
              row: input.data ?? { id: Date.now(), created_at: new Date().toISOString() },
            },
          })
          break

        // ─── SendGrid ────────────────────────────
        case 'sendgrid.sendEmail':
          resolve({
            ok: true,
            data: {
              success: true,
              messageId: `sg.${Date.now()}.${Math.random().toString(36).substring(2, 10)}`,
              to: input.to,
              from: input.from,
              subject: input.subject,
              sentAt: new Date().toISOString(),
            },
          })
          break
        case 'sendgrid.addContactToList':
          resolve({
            ok: true,
            data: {
              job_id: `job-${Date.now()}`,
              status: 'processing',
            },
          })
          break
        case 'sendgrid.getDeliveryStats':
          resolve({
            ok: true,
            data: {
              stats: [
                { date: '2024-01-15', stats: [{ metrics: { delivers: 1250, opens: 890, clicks: 342, bounces: 15, spam_reports: 3 } }] },
                { date: '2024-01-16', stats: [{ metrics: { delivers: 1180, opens: 810, clicks: 298, bounces: 22, spam_reports: 5 } }] },
                { date: '2024-01-17', stats: [{ metrics: { delivers: 1320, opens: 950, clicks: 412, bounces: 11, spam_reports: 2 } }] },
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
