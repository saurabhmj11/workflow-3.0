// ─── Engine Tests ───────────────────────────────
import { describe, it, expect } from 'vitest'
import { getCategoryForType, NODE_CATEGORIES } from '@/lib/types'

describe('getCategoryForType', () => {
  it('maps trigger types correctly', () => {
    expect(getCategoryForType('email').category).toBe('trigger')
    expect(getCategoryForType('webhook').category).toBe('trigger')
    expect(getCategoryForType('schedule').category).toBe('trigger')
    expect(getCategoryForType('api').category).toBe('trigger')
  })

  it('maps AI types correctly', () => {
    expect(getCategoryForType('llm').category).toBe('ai')
    expect(getCategoryForType('classifier').category).toBe('ai')
    expect(getCategoryForType('agent').category).toBe('ai')
    expect(getCategoryForType('rag').category).toBe('ai')
    expect(getCategoryForType('summarizer').category).toBe('ai')
  })

  it('maps logic types correctly', () => {
    expect(getCategoryForType('condition').category).toBe('logic')
    expect(getCategoryForType('switch').category).toBe('logic')
    expect(getCategoryForType('loop').category).toBe('logic')
    expect(getCategoryForType('delay').category).toBe('logic')
    expect(getCategoryForType('retry').category).toBe('logic')
  })

  it('maps human types correctly', () => {
    expect(getCategoryForType('approval').category).toBe('human')
    expect(getCategoryForType('review').category).toBe('human')
    expect(getCategoryForType('escalation').category).toBe('human')
  })

  it('maps action types correctly', () => {
    expect(getCategoryForType('crm').category).toBe('action')
    expect(getCategoryForType('slack').category).toBe('action')
    expect(getCategoryForType('database').category).toBe('action')
  })

  it('returns first category as fallback for unknown types', () => {
    const result = getCategoryForType('unknown-type-xyz')
    expect(result.category).toBe(NODE_CATEGORIES[0].category)
  })
})

describe('NODE_CATEGORIES', () => {
  it('has 5 categories', () => {
    expect(NODE_CATEGORIES).toHaveLength(5)
  })

  it('includes trigger, logic, ai, human, action', () => {
    const categories = NODE_CATEGORIES.map(c => c.category)
    expect(categories).toContain('trigger')
    expect(categories).toContain('logic')
    expect(categories).toContain('ai')
    expect(categories).toContain('human')
    expect(categories).toContain('action')
  })
})
