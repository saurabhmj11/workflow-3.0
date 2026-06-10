// ─── OpenWorkflow Agent Memory Layer ─────────────
// Provides customer context, interaction history, sentiment tracking,
// knowledge extraction, and memory notes to AI employees.
// Makes agents "feel like employees" who remember past conversations
// and customer preferences.

import type { Interaction, SentimentLog } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('Memory')

// ─── Customer Context ────────────────────────────
// This is what gets injected into AI prompts so the agent "knows" the customer

export interface CustomerContext {
  email: string
  name: string | null
  company: string | null
  tier: 'free' | 'starter' | 'pro' | 'enterprise'
  recentInteractions: InteractionSummary[]
  sentimentTrend: 'improving' | 'stable' | 'declining' | 'unknown'
  avgSentimentScore: number
  totalInteractions: number
  openTickets: number
  lastInteractionDays: number | null  // Days since last interaction
  tags: string[]
  metadata: Record<string, unknown>
  memoryNotes?: MemoryNoteSummary[]  // AI-extracted knowledge
}

export interface InteractionSummary {
  id: string
  type: string
  subject: string | null
  summary: string | null
  sentiment: string | null
  status: string
  priority: string
  createdAt: string
  resolvedAt: string | null
}

export interface MemoryNoteSummary {
  id: string
  category: string  // preference, fact, insight, warning, commitment
  content: string
  confidence: number
  source: string
  createdAt: string
}

export interface CustomerSearchResult {
  id: string
  email: string
  name: string | null
  company: string | null
  tier: string
  totalInteractions: number
  openTickets: number
  avgSentimentScore: number
  sentimentTrend: string
  memoryNotesCount: number
  recentNotes: MemoryNoteSummary[]
  lastInteractionAt: string | null
}

export interface MemoryAnalytics {
  overview: {
    totalCustomers: number
    totalInteractions: number
    totalSentimentLogs: number
    totalMemoryNotes: number
    openTickets: number
    avgSentimentScore: number
  }
  distributions: {
    customersByTier: Record<string, number>
    interactionsByType: Record<string, number>
    interactionsByStatus: Record<string, number>
    sentimentDistribution: Record<string, number>
    notesByCategory: Record<string, number>
  }
  recentActivity: {
    last7Days: {
      newCustomers: number
      interactions: number
      memoryNotes: number
    }
  }
  topCustomers: Array<{
    id: string
    email: string
    name: string | null
    company: string | null
    tier: string
    interactionCount: number
  }>
  trends: {
    sentiment: Array<{ date: string; avgScore: number; count: number; positive: number; negative: number; neutral: number }>
    interactions: Array<{ date: string; count: number; byType: Record<string, number> }>
  }
}

// ─── Memory Store (Client-side cache) ────────────
// Caches customer profiles and interactions in-memory for fast access during execution

class MemoryStore {
  private customerCache = new Map<string, CustomerContext>()
  private analyticsCache: MemoryAnalytics | null = null
  private analyticsCacheExpiry = 0
  private maxCacheSize = 100

  // Get customer context — from cache or API
  async getCustomerContext(email: string): Promise<CustomerContext | null> {
    const cached = this.customerCache.get(email)
    if (cached) return cached

    try {
      const res = await fetch(`/api/memory/customer?email=${encodeURIComponent(email)}`)
      const json = await res.json()
      if (json.ok && json.data) {
        const context = json.data as CustomerContext
        // Also fetch memory notes for this customer
        try {
          const notesRes = await fetch(`/api/memory/notes?customerId=${(context as any).id || email}`)
          const notesJson = await notesRes.json()
          if (notesJson.ok && notesJson.data) {
            context.memoryNotes = notesJson.data.slice(0, 10)
          }
        } catch {
          // Notes fetch failed — still return context without notes
        }
        this.setCache(email, context)
        return context
      }
    } catch (err) {
      log.warn({ err, email }, 'Failed to fetch customer context')
    }
    return null
  }

  // Create or update a customer profile
  async upsertCustomer(data: {
    email: string
    name?: string
    company?: string
    tier?: string
    metadata?: Record<string, unknown>
  }): Promise<CustomerContext | null> {
    try {
      const res = await fetch('/api/memory/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.ok && json.data) {
        const context = json.data as CustomerContext
        this.setCache(data.email, context)
        return context
      }
    } catch (err) {
      log.warn({ err, email: data.email }, 'Failed to upsert customer')
    }
    return null
  }

  // Record an interaction
  async recordInteraction(data: {
    customerId: string
    type: string
    subject?: string
    content: string
    sentiment?: string
    confidence?: number
    status?: string
    priority?: string
    assignee?: string
    resolution?: string
    tags?: string[]
    metadata?: Record<string, unknown>
  }): Promise<void> {
    try {
      await fetch('/api/memory/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      // Invalidate cache for this customer
      this.customerCache.delete(data.customerId)
    } catch (err) {
      log.warn({ err, customerId: data.customerId }, 'Failed to record interaction')
    }
  }

  // Record sentiment
  async recordSentiment(data: {
    customerId: string
    source: string
    sentiment: string
    score: number
    confidence: number
  }): Promise<void> {
    try {
      await fetch('/api/memory/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch (err) {
      log.warn({ err, customerId: data.customerId }, 'Failed to record sentiment')
    }
  }

  // ─── Search customers ──────────────────────────
  async searchCustomers(query: string, tier?: string): Promise<CustomerSearchResult[]> {
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (tier) params.set('tier', tier)
      const res = await fetch(`/api/memory/search?${params}`)
      const json = await res.json()
      if (json.ok && json.data) {
        return json.data.results as CustomerSearchResult[]
      }
    } catch (err) {
      log.warn({ err, query }, 'Failed to search customers')
    }
    return []
  }

  // ─── Get memory analytics ──────────────────────
  async getAnalytics(): Promise<MemoryAnalytics | null> {
    // Use cache if fresh (< 30 seconds)
    if (this.analyticsCache && Date.now() < this.analyticsCacheExpiry) {
      return this.analyticsCache
    }
    try {
      const res = await fetch('/api/memory/analytics')
      const json = await res.json()
      if (json.ok && json.data) {
        this.analyticsCache = json.data as MemoryAnalytics
        this.analyticsCacheExpiry = Date.now() + 30000
        return this.analyticsCache
      }
    } catch (err) {
      log.warn({ err }, 'Failed to fetch analytics')
    }
    return null
  }

  // ─── Get memory notes ──────────────────────────
  async getNotes(customerId?: string, category?: string): Promise<MemoryNoteSummary[]> {
    try {
      const params = new URLSearchParams()
      if (customerId) params.set('customerId', customerId)
      if (category) params.set('category', category)
      const res = await fetch(`/api/memory/notes?${params}`)
      const json = await res.json()
      if (json.ok && json.data) {
        return json.data as MemoryNoteSummary[]
      }
    } catch (err) {
      log.warn({ err, customerId }, 'Failed to fetch notes')
    }
    return []
  }

  // ─── Create a memory note ──────────────────────
  async createNote(data: {
    customerId: string
    category: string
    content: string
    source?: string
    confidence?: number
    tags?: string[]
  }): Promise<MemoryNoteSummary | null> {
    try {
      const res = await fetch('/api/memory/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (json.ok && json.data) {
        // Invalidate caches
        this.analyticsCache = null
        return json.data as MemoryNoteSummary
      }
    } catch (err) {
      log.warn({ err, customerId: data.customerId }, 'Failed to create note')
    }
    return null
  }

  // ─── Delete a memory note ──────────────────────
  async deleteNote(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/memory/notes?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.ok) {
        this.analyticsCache = null
        return true
      }
    } catch (err) {
      log.warn({ err, id }, 'Failed to delete note')
    }
    return false
  }

  // ─── Extract knowledge via AI ──────────────────
  async extractKnowledge(customerId: string, interactionIds?: string[]): Promise<{
    notes: MemoryNoteSummary[]
    analyzedInteractions: number
  } | null> {
    try {
      const res = await fetch('/api/memory/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, interactionIds }),
      })
      const json = await res.json()
      if (json.ok && json.data) {
        // Invalidate caches
        this.analyticsCache = null
        return json.data
      }
    } catch (err) {
      log.warn({ err, customerId }, 'Failed to extract knowledge')
    }
    return null
  }

  // Build a prompt injection string from customer context
  // This is what gets added to the system prompt so the AI "knows" the customer
  buildMemoryPrompt(context: CustomerContext): string {
    const parts: string[] = []

    parts.push(`--- Customer Context ---`)
    parts.push(`Email: ${context.email}`)
    if (context.name) parts.push(`Name: ${context.name}`)
    if (context.company) parts.push(`Company: ${context.company}`)
    parts.push(`Account Tier: ${context.tier.toUpperCase()}`)
    parts.push(`Total Interactions: ${context.totalInteractions}`)
    parts.push(`Open Tickets: ${context.openTickets}`)

    if (context.lastInteractionDays !== null) {
      parts.push(`Last Contact: ${context.lastInteractionDays === 0 ? 'Today' : `${context.lastInteractionDays} days ago`}`)
    }

    if (context.sentimentTrend !== 'unknown') {
      parts.push(`Sentiment Trend: ${context.sentimentTrend} (avg score: ${context.avgSentimentScore.toFixed(2)})`)
    }

    if (context.tags.length > 0) {
      parts.push(`Tags: ${context.tags.join(', ')}`)
    }

    // ─── Memory Notes (AI-extracted knowledge) ───
    if (context.memoryNotes && context.memoryNotes.length > 0) {
      parts.push(`\nCustomer Knowledge (AI-extracted):`)
      for (const note of context.memoryNotes.slice(0, 8)) {
        parts.push(`- [${note.category}] ${note.content} (confidence: ${(note.confidence * 100).toFixed(0)}%)`)
      }
    }

    if (context.recentInteractions.length > 0) {
      parts.push(`\nRecent Interactions:`)
      for (const interaction of context.recentInteractions.slice(0, 5)) {
        const date = new Date(interaction.createdAt).toLocaleDateString()
        parts.push(`- [${date}] ${interaction.type}: ${interaction.subject || 'No subject'} (${interaction.status}${interaction.sentiment ? `, sentiment: ${interaction.sentiment}` : ''})`)
        if (interaction.summary) {
          parts.push(`  Summary: ${interaction.summary}`)
        }
      }
    }

    parts.push(`--- End Customer Context ---`)
    return parts.join('\n')
  }

  // Simulated customer context for demo purposes
  getSimulatedContext(email: string): CustomerContext {
    const isVip = email.includes('vip') || email.includes('enterprise')
    const isFrustrated = email.includes('angry') || email.includes('complaint')

    return {
      email,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      company: isVip ? 'Enterprise Corp' : email.split('@')[1]?.split('.')[0] ?? 'Unknown',
      tier: isVip ? 'enterprise' : 'pro',
      recentInteractions: [
        {
          id: 'int-1',
          type: 'email',
          subject: 'Billing question about Q4 invoice',
          summary: 'Customer asked about a $47.50 discrepancy. Resolved with credit.',
          sentiment: isFrustrated ? 'negative' : 'neutral',
          status: 'resolved',
          priority: 'normal',
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          resolvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: 'int-2',
          type: 'chat',
          subject: 'Feature request: bulk export',
          summary: 'Customer requested bulk export for analytics. Escalated to product.',
          sentiment: 'positive',
          status: 'escalated',
          priority: 'low',
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          resolvedAt: null,
        },
        {
          id: 'int-3',
          type: 'ticket',
          subject: 'API rate limit exceeded',
          summary: 'Customer hit rate limits on Pro plan. Suggested upgrade to Enterprise.',
          sentiment: isFrustrated ? 'negative' : 'neutral',
          status: 'resolved',
          priority: 'high',
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          resolvedAt: new Date(Date.now() - 13 * 86400000).toISOString(),
        },
      ],
      sentimentTrend: isFrustrated ? 'declining' : isVip ? 'stable' : 'improving',
      avgSentimentScore: isFrustrated ? -0.3 : isVip ? 0.5 : 0.2,
      totalInteractions: 12 + Math.floor(Math.random() * 20),
      openTickets: isFrustrated ? 3 : 1,
      lastInteractionDays: isFrustrated ? 0 : 3,
      tags: isVip ? ['enterprise', 'priority-support', 'high-value'] : ['pro', 'active-user'],
      metadata: {
        plan: isVip ? 'Enterprise' : 'Pro',
        mrr: isVip ? '$2,499' : '$49',
        accountAge: '8 months',
        npsScore: isFrustrated ? 4 : isVip ? 9 : 7,
      },
      memoryNotes: isVip ? [
        { id: 'mn-1', category: 'preference', content: 'Prefers email communication over phone calls', confidence: 0.95, source: 'ai_extraction', createdAt: new Date().toISOString() },
        { id: 'mn-2', category: 'fact', content: 'Contract renewal coming up in Q2 2025', confidence: 0.9, source: 'ai_extraction', createdAt: new Date().toISOString() },
        { id: 'mn-3', category: 'warning', content: 'Has mentioned evaluating competitors twice in recent calls', confidence: 0.85, source: 'ai_extraction', createdAt: new Date().toISOString() },
      ] : [
        { id: 'mn-4', category: 'preference', content: 'Prefers self-service documentation over direct support', confidence: 0.8, source: 'ai_extraction', createdAt: new Date().toISOString() },
      ],
    }
  }

  private setCache(email: string, context: CustomerContext) {
    if (this.customerCache.size >= this.maxCacheSize) {
      // Evict oldest entry
      const firstKey = this.customerCache.keys().next().value
      if (firstKey) this.customerCache.delete(firstKey)
    }
    this.customerCache.set(email, context)
  }

  clearCache() {
    this.customerCache.clear()
    this.analyticsCache = null
  }
}

// Singleton
export const memoryStore = new MemoryStore()
