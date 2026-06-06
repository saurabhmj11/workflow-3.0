import ZAI from 'z-ai-web-dev-sdk'
import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an AI workflow generator for OpenWorkflow, an AI Workflow Operating System.

Given a natural language description of a workflow, you must output a valid JSON workflow definition.

Available node types by category:
- Trigger: api, webhook, schedule, email, voice-call, whatsapp
- Logic: condition, switch, loop, retry, delay
- AI: llm, agent, rag, classifier, summarizer
- Human: approval, review, escalation
- Action: crm, email, slack, whatsapp, database

You must output ONLY valid JSON (no markdown, no code fences) with this structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "node-1",
      "type": "one of the node types above",
      "label": "Human-readable label",
      "category": "trigger|logic|ai|human|action",
      "config": { ... node-specific config ... },
      "position": { "x": number, "y": number }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-id",
      "target": "node-id",
      "sourceHandle": "default|true|false|approved|rejected|error",
      "targetHandle": "input"
    }
  ]
}

Layout rules:
- Position nodes top-to-bottom with ~150px vertical spacing
- Start first node at x:250, y:50
- Center all nodes horizontally around x:250
- Use sourceHandle "true"/"false" for condition nodes
- Use sourceHandle "approved"/"rejected" for approval/review nodes
- All other nodes use sourceHandle "default"

Config examples:
- llm: { "model": "gpt-4o", "systemPrompt": "...", "temperature": 0.7 }
- classifier: { "categories": "urgent,normal,low" }
- condition: { "expression": "classification === 'urgent'" }
- email (action): { "to": "user@example.com", "subject": "...", "body": "..." }
- approval: { "assignee": "manager@company.com", "message": "..." }
- rag: { "vectorStore": "pinecone", "topK": 5 }
- crm: { "action": "update", "objectType": "contact" }

IMPORTANT: Output ONLY the JSON object. No explanations, no markdown fences.`

export async function POST(request: Request) {
  try {
    const { description } = await request.json()

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Description is required' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Generate a workflow for: ${description.trim()}` },
      ],
      model: 'gpt-4o',
      temperature: 0.4,
      max_tokens: 4096,
    })

    const content = completion.choices[0]?.message?.content || ''

    // Parse the JSON from the response — handle markdown fences
    let cleaned = content.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3)
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }
    cleaned = cleaned.trim()

    let workflow
    try {
      workflow = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { ok: false, error: 'AI generated invalid workflow JSON. Please try again.', raw: content },
        { status: 422 }
      )
    }

    // Validate basic structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Generated workflow has no nodes. Please try a more specific description.' },
        { status: 422 }
      )
    }

    // Ensure each node has required fields
    for (const node of workflow.nodes) {
      if (!node.id) node.id = `node-${Math.random().toString(36).slice(2, 8)}`
      if (!node.type) node.type = 'llm'
      if (!node.label) node.label = node.type
      if (!node.category) {
        const typeToCategory: Record<string, string> = {
          api: 'trigger', webhook: 'trigger', schedule: 'trigger', email: 'trigger', 'voice-call': 'trigger', whatsapp: 'trigger',
          condition: 'logic', switch: 'logic', loop: 'logic', retry: 'logic', delay: 'logic',
          llm: 'ai', agent: 'ai', rag: 'ai', classifier: 'ai', summarizer: 'ai',
          approval: 'human', review: 'human', escalation: 'human',
          crm: 'action', slack: 'action', database: 'action',
        }
        if (node.type === 'email' && node.category !== 'trigger') {
          node.category = 'action'
        } else if (node.type === 'whatsapp' && node.category !== 'trigger') {
          node.category = 'action'
        } else {
          node.category = typeToCategory[node.type] || 'ai'
        }
      }
      if (!node.config) node.config = {}
      if (!node.position) node.position = { x: 250, y: 50 }
    }

    // Ensure edges array exists
    if (!workflow.edges) workflow.edges = []

    // Ensure each edge has required fields
    for (const edge of workflow.edges) {
      if (!edge.id) edge.id = `edge-${Math.random().toString(36).slice(2, 8)}`
      if (!edge.sourceHandle) edge.sourceHandle = 'default'
      if (!edge.targetHandle) edge.targetHandle = 'input'
    }

    return NextResponse.json({
      ok: true,
      data: workflow,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Workflow generation failed'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
