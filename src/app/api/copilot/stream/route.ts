import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export const maxDuration = 30

interface CopilotMessage {
  role: string
  content: string
}

interface WorkflowContext {
  nodes: any[]
  edges: any[]
  workflowName: string
}

const COPILOT_SYSTEM_PROMPT = `You are the OpenWorkflow AI Copilot — an intelligent assistant embedded inside the OpenWorkflow platform. You help users build, deploy, manage, and analyze AI Employees by providing expert guidance, workflow suggestions, and direct workflow manipulation.

## About OpenWorkflow

OpenWorkflow is an AI Employee platform that lets users build, deploy, and manage AI workers that automate business processes. Users create visual workflows using a drag-and-drop canvas, connecting nodes that represent triggers, AI processing, logic, human touchpoints, and actions.

## Your Behavior

1. **Be concise but thorough** — Give actionable advice, not vague suggestions
2. **Suggest specific node types** — When recommending workflow patterns, name the exact nodes (e.g., "Add a classifier node followed by a condition node for confidence routing")
3. **Recommend best practices** — Always suggest confidence routing for AI nodes, memory layer for customer workflows, and human-in-the-loop for critical decisions
4. **Provide workflow templates** — When users ask to build a workflow, describe the full node sequence
5. **Explain features when asked** — Give clear explanations of OpenWorkflow features with practical examples

You are responding to a streaming request. You MUST respond with markdown formatted text. Do not wrap it in a JSON object. Provide your analysis, reasoning and workflow generation steps directly as text.`

function buildWorkflowContextPrompt(context: WorkflowContext): string {
  const nodeSummary = context.nodes.map((n: any) => {
    const label = n.data?.label || n.type || 'Unnamed'
    return `  - ${label} (type: ${n.type}, id: ${n.id})`
  }).join('\n')

  const edgeSummary = context.edges.map((e: any) => {
    return `  - ${e.source} → ${e.target}${e.data?.label ? ` (${e.data.label})` : ''}`
  }).join('\n')

  return `\n\n## Current Workflow Context\n\nThe user currently has a workflow open named "${context.workflowName}" with the following structure:\n\n### Nodes (${context.nodes.length} total):\n${nodeSummary || '  (empty workflow)'}\n\n### Connections (${context.edges.length} total):\n${edgeSummary || '  (no connections)'}\n\nUse this context to give specific, tailored advice about their current workflow. Reference specific nodes by name when making suggestions.`
}

async function handlePost(request: Request) {
  try {
    const body = await request.json()
    const { messages = [], workflowContext } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Messages are required' },
        { status: 400 }
      )
    }

    let systemPrompt = COPILOT_SYSTEM_PROMPT
    if (workflowContext) {
      systemPrompt += buildWorkflowContextPrompt(workflowContext)
    }

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: CopilotMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const zai = await ZAI.create()

    // Using ZAI to generate a stream
    const responseStream = await zai.chat.completions.create({
      messages: aiMessages,
      stream: true,
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('[Copilot Stream Error]', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('[Copilot Stream API] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(RATE_LIMITS.copilot, handlePost)
