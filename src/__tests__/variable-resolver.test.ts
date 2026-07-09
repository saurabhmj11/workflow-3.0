// ─── Variable Resolver Tests ────────────────────
import { describe, it, expect } from 'vitest'
import { resolveVariables, getNestedValue, evaluateSimpleCondition, simpleHash } from '@/lib/variable-resolver'
import type { ResolutionContext } from '@/lib/variable-resolver'

describe('getNestedValue', () => {
  it('returns value from flat object', () => {
    expect(getNestedValue({ name: 'John' }, 'name')).toBe('John')
  })

  it('returns value from nested object', () => {
    expect(getNestedValue({ user: { name: 'John' } }, 'user.name')).toBe('John')
  })

  it('returns value from array by index', () => {
    expect(getNestedValue({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b')
  })

  it('returns undefined for missing path', () => {
    expect(getNestedValue({ name: 'John' }, 'age')).toBeUndefined()
  })

  it('returns undefined for null object', () => {
    expect(getNestedValue(null, 'name')).toBeUndefined()
  })

  it('handles deeply nested paths', () => {
    const obj = { a: { b: { c: { d: 'deep' } } } }
    expect(getNestedValue(obj, 'a.b.c.d')).toBe('deep')
  })

  it('handles array index out of bounds', () => {
    expect(getNestedValue({ items: ['a'] }, 'items.5')).toBeUndefined()
  })

  it('handles path through null', () => {
    expect(getNestedValue({ a: null }, 'a.b')).toBeUndefined()
  })
})

describe('resolveVariables', () => {
  const baseContext: ResolutionContext = {
    nodeOutputs: {
      'node-1': { classification: 'billing', confidence: 0.95 },
      'node-2': { response: 'Here is your answer', tokens: 150 },
    },
    input: { sender: 'user@example.com', subject: 'Help needed', priority: 3 },
    variables: { environment: 'production', version: '2.0' },
    config: { model: 'gpt-4o', temperature: 0.7 },
  }

  it('resolves {{nodes.nodeId.field}}', () => {
    const result = resolveVariables('{{nodes.node-1.classification}}', baseContext)
    expect(result).toBe('billing')
  })

  it('resolves {{input.field}}', () => {
    const result = resolveVariables('{{input.sender}}', baseContext)
    expect(result).toBe('user@example.com')
  })

  it('resolves {{config.key}}', () => {
    const result = resolveVariables('{{config.model}}', baseContext)
    expect(result).toBe('gpt-4o')
  })

  it('resolves {{context.variables.key}}', () => {
    const result = resolveVariables('{{context.variables.environment}}', baseContext)
    expect(result).toBe('production')
  })

  it('resolves bare variable from input', () => {
    const result = resolveVariables('{{sender}}', baseContext)
    expect(result).toBe('user@example.com')
  })

  it('resolves bare variable from node outputs', () => {
    const result = resolveVariables('{{classification}}', baseContext)
    expect(result).toBe('billing')
  })

  it('preserves type for single expressions (number)', () => {
    const result = resolveVariables('{{input.priority}}', baseContext)
    expect(result).toBe(3)
    expect(typeof result).toBe('number')
  })

  it('preserves type for single expressions (object)', () => {
    const result = resolveVariables('{{nodes.node-1}}', baseContext)
    expect(result).toEqual({ classification: 'billing', confidence: 0.95 })
  })

  it('concatenates multiple templates as strings', () => {
    const result = resolveVariables('Class: {{nodes.node-1.classification}}, From: {{input.sender}}', baseContext)
    expect(result).toBe('Class: billing, From: user@example.com')
  })

  it('keeps unresolved templates as-is', () => {
    const result = resolveVariables('{{unknown.variable}}', baseContext)
    expect(result).toBe('{{unknown.variable}}')
  })

  it('resolves templates in objects', () => {
    const input = {
      to: '{{input.sender}}',
      subject: 'Re: {{input.subject}}',
      body: '{{nodes.node-2.response}}',
    }
    const result = resolveVariables(input, baseContext) as Record<string, unknown>
    expect(result.to).toBe('user@example.com')
    expect(result.subject).toBe('Re: Help needed')
    expect(result.body).toBe('Here is your answer')
  })

  it('resolves templates in arrays', () => {
    const input = ['{{nodes.node-1.classification}}', '{{input.sender}}']
    const result = resolveVariables(input, baseContext) as string[]
    expect(result).toEqual(['billing', 'user@example.com'])
  })

  it('passes through non-template strings unchanged', () => {
    expect(resolveVariables('hello world', baseContext)).toBe('hello world')
  })

  it('passes through numbers unchanged', () => {
    expect(resolveVariables(42, baseContext)).toBe(42)
  })

  it('passes through null unchanged', () => {
    expect(resolveVariables(null, baseContext)).toBeNull()
  })

  it('passes through booleans unchanged', () => {
    expect(resolveVariables(true, baseContext)).toBe(true)
  })
})

describe('evaluateSimpleCondition', () => {
  it('evaluates string equality', () => {
    expect(evaluateSimpleCondition('classification === "billing"', { classification: 'billing' })).toBe(true)
    expect(evaluateSimpleCondition('classification === "technical"', { classification: 'billing' })).toBe(false)
  })

  it('evaluates string inequality', () => {
    expect(evaluateSimpleCondition('classification !== "technical"', { classification: 'billing' })).toBe(true)
  })

  it('evaluates numeric comparison', () => {
    expect(evaluateSimpleCondition('confidence >= 80', { confidence: 95 })).toBe(true)
    expect(evaluateSimpleCondition('confidence >= 80', { confidence: 70 })).toBe(false)
  })

  it('evaluates greater than', () => {
    expect(evaluateSimpleCondition('score > 5', { score: 7 })).toBe(true)
    expect(evaluateSimpleCondition('score > 5', { score: 5 })).toBe(false)
  })

  it('evaluates less than or equal', () => {
    expect(evaluateSimpleCondition('priority <= 3', { priority: 2 })).toBe(true)
    expect(evaluateSimpleCondition('priority <= 3', { priority: 4 })).toBe(false)
  })

  it('evaluates boolean equality', () => {
    expect(evaluateSimpleCondition('active === true', { active: true })).toBe(true)
    expect(evaluateSimpleCondition('active === false', { active: true })).toBe(false)
  })

  it('evaluates OR conditions', () => {
    expect(evaluateSimpleCondition('tier === "enterprise" || tier === "pro"', { tier: 'pro' })).toBe(true)
    expect(evaluateSimpleCondition('tier === "enterprise" || tier === "pro"', { tier: 'starter' })).toBe(false)
  })

  it('evaluates AND conditions', () => {
    expect(evaluateSimpleCondition('confidence >= 80 && tier === "enterprise"', { confidence: 90, tier: 'enterprise' })).toBe(true)
    expect(evaluateSimpleCondition('confidence >= 80 && tier === "enterprise"', { confidence: 90, tier: 'starter' })).toBe(false)
  })

  it('evaluates negation', () => {
    expect(evaluateSimpleCondition('!disabled', { disabled: false })).toBe(true)
    expect(evaluateSimpleCondition('!disabled', { disabled: true })).toBe(false)
  })

  it('evaluates truthy check for bare values', () => {
    expect(evaluateSimpleCondition('hasData', { hasData: true })).toBe(true)
    expect(evaluateSimpleCondition('hasData', { hasData: false })).toBe(false)
  })

  it('returns false for empty expression', () => {
    expect(evaluateSimpleCondition('', {})).toBe(false)
  })

  it('handles single-quoted strings', () => {
    expect(evaluateSimpleCondition("status === 'active'", { status: 'active' })).toBe(true)
  })

  it('evaluates parenthesized expressions', () => {
    expect(evaluateSimpleCondition('(confidence >= 80)', { confidence: 90 })).toBe(true)
  })
})

describe('simpleHash', () => {
  it('returns a number', () => {
    expect(typeof simpleHash('test')).toBe('number')
  })

  it('returns same hash for same input', () => {
    expect(simpleHash('hello')).toBe(simpleHash('hello'))
  })

  it('returns different hashes for different inputs', () => {
    expect(simpleHash('hello')).not.toBe(simpleHash('world'))
  })

  it('returns positive numbers', () => {
    expect(simpleHash('any string')).toBeGreaterThanOrEqual(0)
  })
})
