import ZAI from 'z-ai-web-dev-sdk'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { messages, model, temperature, maxTokens } = await request.json()

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages,
      model: model || 'gpt-4o',
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 2048,
    })

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI completion failed'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
