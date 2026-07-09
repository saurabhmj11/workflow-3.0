// ─── Agent Memory System ─────────────────────────────
// The customer context layer — before RAG, the agent looks up customer memory.
// This is the "Employee remembers" feature.

// ─── Types ────────────────────────────────────────────

export interface TicketSummary {
  id: string
  subject: string
  category: string
  status: 'resolved' | 'open' | 'escalated'
  createdAt: string
  resolutionTime?: string
}

export interface PurchaseRecord {
  product: string
  amount: number
  date: string
  status: 'active' | 'cancelled' | 'trial'
}

export interface CustomerMemory {
  id: string
  email: string
  name: string
  tier: 'free' | 'pro' | 'enterprise'
  previousTickets: TicketSummary[]
  purchaseHistory: PurchaseRecord[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated'
  lastContactDate: string
  totalInteractions: number
  avgResolutionTime: string
  preferences: Record<string, string>
}

// ─── Sample Customer Database ─────────────────────────

const SAMPLE_CUSTOMERS: CustomerMemory[] = [
  {
    id: 'cust-001',
    email: 'john@acme.com',
    name: 'John Smith',
    tier: 'enterprise',
    previousTickets: [
      {
        id: 'TKT-1042',
        subject: 'SSO configuration for Okta',
        category: 'Authentication',
        status: 'resolved',
        createdAt: '2026-02-15',
        resolutionTime: '2h 15m',
      },
      {
        id: 'TKT-1089',
        subject: 'API rate limit increase request',
        category: 'Billing',
        status: 'resolved',
        createdAt: '2026-03-01',
        resolutionTime: '4h 30m',
      },
      {
        id: 'TKT-1156',
        subject: 'Custom webhook integration',
        category: 'Integration',
        status: 'open',
        createdAt: '2026-05-20',
      },
      {
        id: 'TKT-1198',
        subject: 'Data export in bulk format',
        category: 'Data',
        status: 'resolved',
        createdAt: '2026-04-10',
        resolutionTime: '1h 45m',
      },
    ],
    purchaseHistory: [
      { product: 'Enterprise Plan', amount: 299, date: '2025-06-01', status: 'active' },
      { product: 'API Add-on (100K calls)', amount: 99, date: '2025-08-15', status: 'active' },
    ],
    sentiment: 'positive',
    lastContactDate: '2026-06-06',
    totalInteractions: 24,
    avgResolutionTime: '2.8h',
    preferences: {
      communicationChannel: 'email',
      timezone: 'US/Eastern',
      technicalLevel: 'advanced',
      preferredLanguage: 'English',
    },
  },
  {
    id: 'cust-002',
    email: 'sarah@startup.io',
    name: 'Sarah Chen',
    tier: 'pro',
    previousTickets: [
      {
        id: 'TKT-2011',
        subject: 'Workflow automation setup',
        category: 'Onboarding',
        status: 'resolved',
        createdAt: '2026-01-22',
        resolutionTime: '3h 10m',
      },
      {
        id: 'TKT-2078',
        subject: 'Slack integration not sending notifications',
        category: 'Integration',
        status: 'escalated',
        createdAt: '2026-05-28',
      },
      {
        id: 'TKT-2099',
        subject: 'Upgrade plan inquiry',
        category: 'Billing',
        status: 'resolved',
        createdAt: '2026-04-15',
        resolutionTime: '45m',
      },
    ],
    purchaseHistory: [
      { product: 'Pro Plan', amount: 49, date: '2026-01-10', status: 'active' },
      { product: 'Team Plan', amount: 29, date: '2026-03-01', status: 'active' },
    ],
    sentiment: 'neutral',
    lastContactDate: '2026-06-04',
    totalInteractions: 8,
    avgResolutionTime: '1.5h',
    preferences: {
      communicationChannel: 'slack',
      timezone: 'US/Pacific',
      technicalLevel: 'intermediate',
      preferredLanguage: 'English',
    },
  },
  {
    id: 'cust-003',
    email: 'mike@company.com',
    name: 'Mike Johnson',
    tier: 'free',
    previousTickets: [
      {
        id: 'TKT-3005',
        subject: 'Cannot login to dashboard',
        category: 'Authentication',
        status: 'resolved',
        createdAt: '2026-04-02',
        resolutionTime: '6h 20m',
      },
      {
        id: 'TKT-3044',
        subject: 'Missing features compared to competitor',
        category: 'Feature Request',
        status: 'open',
        createdAt: '2026-06-01',
      },
    ],
    purchaseHistory: [
      { product: 'Free Plan', amount: 0, date: '2026-03-15', status: 'active' },
    ],
    sentiment: 'frustrated',
    lastContactDate: '2026-06-07',
    totalInteractions: 3,
    avgResolutionTime: '5.2h',
    preferences: {
      communicationChannel: 'email',
      timezone: 'US/Central',
      technicalLevel: 'beginner',
      preferredLanguage: 'English',
    },
  },
  {
    id: 'cust-004',
    email: 'lisa@design.co',
    name: 'Lisa Park',
    tier: 'pro',
    previousTickets: [
      {
        id: 'TKT-4012',
        subject: 'Custom template creation help',
        category: 'Onboarding',
        status: 'resolved',
        createdAt: '2025-11-05',
        resolutionTime: '1h 30m',
      },
      {
        id: 'TKT-4056',
        subject: 'Billing discrepancy on last invoice',
        category: 'Billing',
        status: 'resolved',
        createdAt: '2026-02-20',
        resolutionTime: '2h 10m',
      },
      {
        id: 'TKT-4101',
        subject: 'Request: Dark mode support',
        category: 'Feature Request',
        status: 'open',
        createdAt: '2026-05-10',
      },
      {
        id: 'TKT-4133',
        subject: 'API documentation unclear for webhooks',
        category: 'Support',
        status: 'resolved',
        createdAt: '2026-04-18',
        resolutionTime: '3h 45m',
      },
    ],
    purchaseHistory: [
      { product: 'Pro Plan', amount: 49, date: '2025-10-01', status: 'active' },
      { product: 'API Add-on', amount: 19, date: '2025-12-01', status: 'cancelled' },
    ],
    sentiment: 'positive',
    lastContactDate: '2026-06-02',
    totalInteractions: 15,
    avgResolutionTime: '2.1h',
    preferences: {
      communicationChannel: 'email',
      timezone: 'US/Eastern',
      technicalLevel: 'intermediate',
      preferredLanguage: 'English',
    },
  },
  {
    id: 'cust-005',
    email: 'alex@tech.dev',
    name: 'Alex Rivera',
    tier: 'enterprise',
    previousTickets: [
      {
        id: 'TKT-5023',
        subject: 'Multi-tenant workspace setup',
        category: 'Onboarding',
        status: 'resolved',
        createdAt: '2025-09-12',
        resolutionTime: '4h 50m',
      },
      {
        id: 'TKT-5067',
        subject: 'Custom SAML SSO integration',
        category: 'Authentication',
        status: 'resolved',
        createdAt: '2025-11-28',
        resolutionTime: '8h 15m',
      },
      {
        id: 'TKT-5112',
        subject: 'SLA monitoring dashboard request',
        category: 'Feature Request',
        status: 'escalated',
        createdAt: '2026-05-15',
      },
    ],
    purchaseHistory: [
      { product: 'Enterprise Plan', amount: 299, date: '2025-09-01', status: 'active' },
      { product: 'Dedicated Support', amount: 149, date: '2025-09-01', status: 'active' },
    ],
    sentiment: 'neutral',
    lastContactDate: '2026-06-05',
    totalInteractions: 31,
    avgResolutionTime: '3.4h',
    preferences: {
      communicationChannel: 'email',
      timezone: 'US/Pacific',
      technicalLevel: 'advanced',
      preferredLanguage: 'English',
    },
  },
]

// ─── In-memory store (mutable for sentiment updates) ──

const customerStore: Map<string, CustomerMemory> = new Map(
  SAMPLE_CUSTOMERS.map((c) => [c.email, c])
)

// ─── Public Functions ─────────────────────────────────

/**
 * Looks up customer by email from the sample database.
 * Returns null if no customer is found.
 */
export function getCustomerMemory(email: string): CustomerMemory | null {
  return customerStore.get(email) ?? null
}

/**
 * Returns all customers in the database.
 */
export function getAllCustomers(): CustomerMemory[] {
  return Array.from(customerStore.values())
}

/**
 * Generates a context string that can be injected into LLM prompts.
 * Example: "Customer: John Smith (Enterprise tier). Previous tickets: 4 (3 resolved, 1 open).
 * Last contact: 2 days ago. Sentiment: positive. Active products: Enterprise Plan ($299/mo), API Add-on ($99/mo)."
 */
export function enrichWithContext(memory: CustomerMemory): string {
  const resolvedCount = memory.previousTickets.filter(
    (t) => t.status === 'resolved'
  ).length
  const openCount = memory.previousTickets.filter(
    (t) => t.status === 'open'
  ).length
  const escalatedCount = memory.previousTickets.filter(
    (t) => t.status === 'escalated'
  ).length

  const ticketSummary = [
    resolvedCount > 0 ? `${resolvedCount} resolved` : null,
    openCount > 0 ? `${openCount} open` : null,
    escalatedCount > 0 ? `${escalatedCount} escalated` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const activeProducts = memory.purchaseHistory
    .filter((p) => p.status === 'active')
    .map((p) => `${p.product} ($${p.amount}/mo)`)
    .join(', ')

  const parts: string[] = []

  parts.push(`Customer: ${memory.name} (${capitalize(memory.tier)} tier).`)
  parts.push(
    `Previous tickets: ${memory.previousTickets.length} (${ticketSummary}).`
  )
  parts.push(`Last contact: ${formatRelativeDate(memory.lastContactDate)}.`)
  parts.push(`Sentiment: ${memory.sentiment}.`)
  parts.push(`Total interactions: ${memory.totalInteractions}.`)
  parts.push(`Avg resolution time: ${memory.avgResolutionTime}.`)

  if (activeProducts) {
    parts.push(`Active products: ${activeProducts}.`)
  }

  // Add preferences if relevant
  if (memory.preferences.technicalLevel) {
    parts.push(`Technical level: ${memory.preferences.technicalLevel}.`)
  }
  if (memory.preferences.communicationChannel) {
    parts.push(
      `Preferred communication: ${memory.preferences.communicationChannel}.`
    )
  }

  return parts.join(' ')
}

/**
 * Updates customer sentiment after interaction.
 */
export function updateSentiment(
  email: string,
  sentiment: CustomerMemory['sentiment']
): void {
  const customer = customerStore.get(email)
  if (customer) {
    customer.sentiment = sentiment
    customerStore.set(email, customer)
  }
}

// ─── Helpers ──────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date('2026-06-08')
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  return `${Math.floor(diffDays / 30)} months ago`
}
