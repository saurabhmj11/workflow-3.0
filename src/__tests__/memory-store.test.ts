// ─── Memory Store Tests ─────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for API calls
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Import after mock — memoryStore is a singleton instance
import { memoryStore } from '@/lib/memory/store'

describe('MemoryStore', () => {
  beforeEach(() => {
    memoryStore.clearCache()
    mockFetch.mockReset()
  })

  describe('getSimulatedContext', () => {
    it('returns a valid customer context object', () => {
      const ctx = memoryStore.getSimulatedContext('test@example.com')
      expect(ctx.email).toBe('test@example.com')
      expect(ctx.name).toBeTruthy()
      expect(ctx.company).toBeTruthy()
      expect(ctx.tier).toBeTruthy()
      expect(typeof ctx.totalInteractions).toBe('number')
      expect(typeof ctx.avgSentimentScore).toBe('number')
    })

    it('returns different contexts for different emails', () => {
      const ctx1 = memoryStore.getSimulatedContext('user1@example.com')
      const ctx2 = memoryStore.getSimulatedContext('user2@example.com')
      expect(ctx1.email).not.toBe(ctx2.email)
    })

    it('returns consistent context for same email', () => {
      const ctx1 = memoryStore.getSimulatedContext('same@example.com')
      const ctx2 = memoryStore.getSimulatedContext('same@example.com')
      expect(ctx1.name).toBe(ctx2.name)
      expect(ctx1.tier).toBe(ctx2.tier)
    })

    it('returns enterprise tier for VIP emails', () => {
      const ctx = memoryStore.getSimulatedContext('user@enterprise.com')
      expect(ctx.tier).toBe('enterprise')
    })

    it('returns declining sentiment for frustrated emails', () => {
      const ctx = memoryStore.getSimulatedContext('angry@company.com')
      expect(ctx.sentimentTrend).toBe('declining')
    })
  })

  describe('buildMemoryPrompt', () => {
    it('builds a prompt string with customer context', () => {
      const ctx = memoryStore.getSimulatedContext('test@example.com')
      const prompt = memoryStore.buildMemoryPrompt(ctx)
      expect(prompt).toContain('Customer Context')
      expect(prompt).toContain('test@example.com')
      expect(prompt).toContain(ctx.name!)
      expect(prompt).toContain(ctx.tier.toUpperCase())
    })

    it('includes recent interactions', () => {
      const ctx = memoryStore.getSimulatedContext('test@example.com')
      const prompt = memoryStore.buildMemoryPrompt(ctx)
      expect(prompt).toContain('Recent Interactions')
    })

    it('includes sentiment information', () => {
      const ctx = memoryStore.getSimulatedContext('test@example.com')
      const prompt = memoryStore.buildMemoryPrompt(ctx)
      expect(prompt).toContain('Sentiment')
    })

    it('includes memory notes when present', () => {
      const ctx = memoryStore.getSimulatedContext('user@enterprise.com')
      const prompt = memoryStore.buildMemoryPrompt(ctx)
      expect(prompt).toContain('Customer Knowledge')
    })
  })

  describe('upsertCustomer', () => {
    it('calls the API to create/update customer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, data: { id: 'cust-1', email: 'new@example.com' } }),
      })

      await memoryStore.upsertCustomer({
        email: 'new@example.com',
        name: 'New User',
        company: 'Test Co',
        tier: 'pro',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/memory/customer',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })

  describe('getCustomerContext', () => {
    it('returns null when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'))
      const ctx = await memoryStore.getCustomerContext('nonexistent@example.com')
      expect(ctx).toBeNull()
    })
  })
})
