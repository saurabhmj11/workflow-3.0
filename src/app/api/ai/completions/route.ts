import ZAI from 'z-ai-web-dev-sdk'
import { NextResponse } from 'next/server'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createLogger } from '@/lib/logger'

const log = createLogger('AI')

export const maxDuration = 30 // seconds

async function handlePost(request: Request) {
  try {
    const body = await request.json()
    const { messages, model, temperature, maxTokens } = body

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { ok: false, error: 'messages must be an array' },
        { status: 400 }
      )
    }

    try {
      const zai = await ZAI.create()

      // Race the AI call against a timeout to prevent server hangs
      const completion = await Promise.race([
        zai.chat.completions.create({
          messages,
          model: model || 'gpt-4o',
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 2048,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI request timed out after 25s')), 25000)
        ),
      ])

      const content = completion.choices[0]?.message?.content || ''
      const usage = completion.usage

      return NextResponse.json({
        ok: true,
        data: {
          content,
          model: completion.model || model,
          usage: usage
            ? {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens,
              }
            : null,
        },
      })
    } catch (aiError: unknown) {
      // AI SDK errors should not crash the server
      const message = aiError instanceof Error ? aiError.message : 'AI completion failed'
      log.error({ message }, 'AI SDK error')
      return NextResponse.json(
        { ok: false, error: message },
        { status: 502 }
      )
    }
  } catch (error: unknown) {
    // Request parsing errors
    const message = error instanceof Error ? error.message : 'Invalid request'
    log.error({ message }, 'AI completions route error')
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 }
    )
  }
}

export const POST = withRateLimit(RATE_LIMITS.ai, handlePost)
