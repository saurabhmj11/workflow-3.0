// ─── Rate Limiter Tests ─────────────────────────
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import type { RateLimitConfig } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  const config: RateLimitConfig = { limit: 3, windowMs: 1000 }
  // Use unique keys per test to avoid state leaking between tests
  let counter = 0
  const uniqueKey = () => `test-key-${Date.now()}-${counter++}`

  it('allows first request', () => {
    const result = checkRateLimit(uniqueKey(), config)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('tracks remaining requests', () => {
    const key = uniqueKey()
    checkRateLimit(key, config) // 1
    const result = checkRateLimit(key, config) // 2
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('blocks requests over the limit', () => {
    const key = uniqueKey()
    checkRateLimit(key, config) // 1
    checkRateLimit(key, config) // 2
    checkRateLimit(key, config) // 3
    const result = checkRateLimit(key, config) // 4 — blocked
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('resets after the window expires', () => {
    const key = uniqueKey()
    const shortConfig: RateLimitConfig = { limit: 1, windowMs: 50 }
    checkRateLimit(key, shortConfig) // 1 — uses the limit
    const blocked = checkRateLimit(key, shortConfig)
    expect(blocked.allowed).toBe(false)

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const after = checkRateLimit(key, shortConfig)
        expect(after.allowed).toBe(true)
        resolve()
      }, 60)
    })
  })

  it('different keys have independent limits', () => {
    const key1 = uniqueKey()
    const key2 = uniqueKey()
    const smallConfig: RateLimitConfig = { limit: 1, windowMs: 5000 }

    const result1 = checkRateLimit(key1, smallConfig)
    const result2 = checkRateLimit(key2, smallConfig)

    expect(result1.allowed).toBe(true)
    expect(result2.allowed).toBe(true)
  })

  it('includes resetTime in result', () => {
    const result = checkRateLimit(uniqueKey(), config)
    expect(result.resetTime).toBeGreaterThan(Date.now() - 1000)
  })
})

describe('RATE_LIMITS presets', () => {
  it('has expected presets', () => {
    expect(RATE_LIMITS.ai.limit).toBe(20)
    expect(RATE_LIMITS.generate.limit).toBe(5)
    expect(RATE_LIMITS.copilot.limit).toBe(30)
    expect(RATE_LIMITS.auth.limit).toBe(10)
    expect(RATE_LIMITS.webhook.limit).toBe(60)
    expect(RATE_LIMITS.api.limit).toBe(100)
  })

  it('all presets have windowMs of 60 seconds', () => {
    for (const preset of Object.values(RATE_LIMITS)) {
      expect(preset.windowMs).toBe(60_000)
    }
  })
})

describe('getRateLimitKey', () => {
  it('uses X-Forwarded-For header', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' },
    })
    expect(getRateLimitKey(request)).toBe('ip:1.2.3.4')
  })

  it('uses X-Real-IP header as fallback', () => {
    const request = new Request('http://localhost/api/test', {
      headers: { 'X-Real-IP': '9.8.7.6' },
    })
    expect(getRateLimitKey(request)).toBe('ip:9.8.7.6')
  })

  it('falls back to unknown when no headers', () => {
    const request = new Request('http://localhost/api/test')
    expect(getRateLimitKey(request)).toBe('ip:unknown')
  })

  it('prefers X-Forwarded-For over X-Real-IP', () => {
    const request = new Request('http://localhost/api/test', {
      headers: {
        'X-Forwarded-For': '1.2.3.4',
        'X-Real-IP': '9.8.7.6',
      },
    })
    expect(getRateLimitKey(request)).toBe('ip:1.2.3.4')
  })
})
