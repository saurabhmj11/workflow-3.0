import ZAI from 'z-ai-web-dev-sdk'
import { NextResponse } from 'next/server'

// ─── System Prompt with Few-Shot Examples ─────────
const SYSTEM_PROMPT = `You are an expert AI workflow architect for OpenWorkflow, an AI Workflow Operating System.

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
- Branch paths should offset horizontally by 250px (left branch at x:50, right branch at x:450)
- Use sourceHandle "true"/"false" for condition nodes
- Use sourceHandle "approved"/"rejected" for approval/review nodes
- All other nodes use sourceHandle "default"

Config examples:
- llm: { "model": "gpt-4o", "systemPrompt": "...", "temperature": 0.7 }
- classifier: { "categories": "urgent,normal,low" }
- condition: { "expression": "classification === 'urgent'" }
- email (action): { "to": "user@example.com", "subject": "...", "body": "..." }
- email (trigger): { "imapServer": "imap.gmail.com", "folder": "INBOX" }
- approval: { "assignee": "manager@company.com", "message": "..." }
- rag: { "vectorStore": "pinecone", "topK": 5 }
- crm: { "action": "update", "objectType": "contact" }
- schedule: { "cron": "*/5 * * * *", "timezone": "UTC" }
- slack: { "channel": "#channel-name", "message": "..." }
- webhook: { "path": "/webhook/path", "method": "POST" }
- delay: { "duration": 60, "unit": "seconds" }
- escalation: { "escalationPath": ["senior@company.com"], "priority": "high" }

EXAMPLE 1 - Customer Support Workflow:
Input: "When a customer emails, classify the issue, search docs, draft a response, and escalate if confidence is below 80%"
Output:
{
  "name": "Customer Support Auto-Response",
  "description": "Automatically classify incoming emails, search knowledge base, draft responses, and escalate low-confidence cases",
  "nodes": [
    { "id": "node-1", "type": "email", "label": "Customer Email", "category": "trigger", "config": { "imapServer": "imap.gmail.com", "folder": "INBOX" }, "position": { "x": 250, "y": 50 } },
    { "id": "node-2", "type": "classifier", "label": "Classify Issue", "category": "ai", "config": { "categories": "billing,technical,account,general,urgent", "model": "gpt-4o" }, "position": { "x": 250, "y": 200 } },
    { "id": "node-3", "type": "condition", "label": "Confidence > 80%?", "category": "logic", "config": { "expression": "confidence >= 80" }, "position": { "x": 250, "y": 350 } },
    { "id": "node-4", "type": "rag", "label": "Search Knowledge Base", "category": "ai", "config": { "vectorStore": "pinecone", "topK": 5, "similarityThreshold": 0.7 }, "position": { "x": 50, "y": 500 } },
    { "id": "node-5", "type": "llm", "label": "Draft Response", "category": "ai", "config": { "model": "gpt-4o", "systemPrompt": "You are a helpful support agent. Draft a professional, empathetic response based on the knowledge base articles found.", "temperature": 0.5 }, "position": { "x": 50, "y": 650 } },
    { "id": "node-6", "type": "approval", "label": "Human Review", "category": "human", "config": { "assignee": "support-lead@company.com", "slaMinutes": 30, "message": "AI drafted a response. Please review before sending." }, "position": { "x": 50, "y": 800 } },
    { "id": "node-7", "type": "email", "label": "Send Response", "category": "action", "config": { "to": "{{input.sender}}", "subject": "Re: {{input.subject}}", "body": "{{nodes.node-5.output.response}}" }, "position": { "x": 50, "y": 950 } },
    { "id": "node-8", "type": "escalation", "label": "Escalate to Human", "category": "human", "config": { "escalationPath": ["senior-support@company.com"], "priority": "high" }, "position": { "x": 450, "y": 500 } },
    { "id": "node-9", "type": "slack", "label": "Notify Team", "category": "action", "config": { "channel": "#support-escalations", "message": "Low-confidence ticket escalated. Needs human attention." }, "position": { "x": 450, "y": 650 } }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2", "sourceHandle": "default", "targetHandle": "input" },
    { "id": "edge-2", "source": "node-2", "target": "node-3", "sourceHandle": "default", "targetHandle": "input" },
    { "id": "edge-3", "source": "node-3", "target": "node-4", "sourceHandle": "true", "targetHandle": "input" },
    { "id": "edge-4", "source": "node-4", "target": "node-5", "sourceHandle": "default", "targetHandle": "input" },
    { "id": "edge-5", "source": "node-5", "target": "node-6", "sourceHandle": "default", "targetHandle": "input" },
    { "id": "edge-6", "source": "node-6", "target": "node-7", "sourceHandle": "approved", "targetHandle": "input" },
    { "id": "edge-7", "source": "node-3", "target": "node-8", "sourceHandle": "false", "targetHandle": "input" },
    { "id": "edge-8", "source": "node-8", "target": "node-9", "sourceHandle": "default", "targetHandle": "input" }
  ]
}

EXAMPLE 2 - Lead Qualification:
Input: "Create a lead qualification workflow: webhook trigger, score the lead, create deal in CRM if qualified, notify sales on Slack"
Output:
{
  "name": "Lead Qualification Pipeline",
  "description": "Score inbound leads and route qualified ones to sales with CRM integration",
  "nodes": [
    { "id": "node-1", "type": "webhook", "label": "Lead Form Submit", "category": "trigger", "config": { "path": "/leads/incoming", "method": "POST" }, "position": { "x": 250, "y": 50 } },
    { "id": "node-2", "type": "llm", "label": "Score Lead", "category": "ai", "config": { "model": "gpt-4o", "systemPrompt": "Analyze this lead data. Score from 1-10 based on company size, budget, timeline, decision-maker status. Return JSON: { score, qualified: boolean, reasoning }", "temperature": 0.3 }, "position": { "x": 250, "y": 200 } },
    { "id": "node-3", "type": "condition", "label": "Qualified?", "category": "logic", "config": { "expression": "score >= 7" }, "position": { "x": 250, "y": 350 } },
    { "id": "node-4", "type": "crm", "label": "Create Deal", "category": "action", "config": { "action": "create", "objectType": "deal", "fields": "{\"stage\": \"qualified\"}" }, "position": { "x": 50, "y": 500 } },
    { "id": "node-5", "type": "slack", "label": "Alert Sales", "category": "action", "config": { "channel": "#hot-leads", "message": "New qualified lead! Check CRM for details." }, "position": { "x": 50, "y": 650 } },
    { "id": "node-6", "type": "email", "label": "Welcome Email", "category": "action", "config": { "to": "{{input.email}}", "subject": "Thanks for reaching out!", "body": "A sales representative will be in touch shortly." }, "position": { "x": 450, "y": 500 } }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2", "sourceHandle": "default", "targetHandle": "input" },
    { "id": "edge-2", "source": "node-2", "target": "node-3", "sourceHandle": "default", "targetHandle": "input" },
    { "id": "edge-3", "source": "node-3", "target": "node-4", "sourceHandle": "true", "targetHandle": "input" },
    { "id": "edge-4", "source": "node-4", "target": "node-5", "sourceHandle": "default", "targetHandle": "input" },
    { "id": "edge-5", "source": "node-3", "target": "node-6", "sourceHandle": "false", "targetHandle": "input" }
  ]
}

IMPORTANT RULES:
1. Output ONLY the JSON object. No explanations, no markdown fences, no comments.
2. Always start with a trigger node (api, webhook, schedule, email).
3. Always use sequential node IDs: node-1, node-2, node-3...
4. Always use sequential edge IDs: edge-1, edge-2, edge-3...
5. Ensure every node (except the first) has at least one incoming edge.
6. Use meaningful labels that describe what each node does.
7. Include realistic config values with variable templates like {{input.field}} or {{nodes.node-X.output.field}}.
8. For branching workflows, use condition nodes with true/false source handles.
9. For human-in-the-loop, use approval/review nodes before critical actions.
10. Keep workflows practical and production-ready - not overly complex.`

// ─── Refinement System Prompt ─────────────────────
const REFINE_SYSTEM_PROMPT = `You are an AI workflow architect for OpenWorkflow. You are given an existing workflow definition and a user's requested modification.

You must output ONLY valid JSON (no markdown, no code fences) with the COMPLETE modified workflow definition following the same structure.

Rules:
1. Apply the user's requested modification to the workflow
2. Preserve all existing nodes and edges that aren't being modified
3. If adding nodes, use the next available node ID number
4. If removing nodes, also remove any edges connected to them
5. Recalculate positions to maintain a clean layout
6. Output ONLY the JSON object

The existing workflow is provided in the user message. Modify it according to the user's request.`

// ─── Validation ────────────────────────────────────

const VALID_TYPES = new Set([
  'api', 'webhook', 'schedule', 'email', 'voice-call', 'whatsapp',
  'condition', 'switch', 'loop', 'retry', 'delay',
  'llm', 'agent', 'rag', 'classifier', 'summarizer',
  'approval', 'review', 'escalation',
  'crm', 'email', 'slack', 'whatsapp', 'database',
])

const TYPE_TO_CATEGORY: Record<string, string> = {
  api: 'trigger', webhook: 'trigger', schedule: 'trigger', email: 'trigger', 'voice-call': 'trigger', whatsapp: 'trigger',
  condition: 'logic', switch: 'logic', loop: 'logic', retry: 'logic', delay: 'logic',
  llm: 'ai', agent: 'ai', rag: 'ai', classifier: 'ai', summarizer: 'ai',
  approval: 'human', review: 'human', escalation: 'human',
  crm: 'action', slack: 'action', database: 'action',
}

function getCategoryForNodeType(type: string, currentCategory?: string): string {
  // Special handling: email and whatsapp can be trigger OR action
  if (type === 'email' && currentCategory === 'action') return 'action'
  if (type === 'email' && currentCategory === 'trigger') return 'trigger'
  if (type === 'whatsapp' && currentCategory === 'action') return 'action'
  if (type === 'whatsapp' && currentCategory === 'trigger') return 'trigger'
  return TYPE_TO_CATEGORY[type] || 'ai'
}

function validateAndFixWorkflow(workflow: Record<string, unknown>): { valid: boolean; workflow: Record<string, unknown>; errors: string[] } {
  const errors: string[] = []
  const nodes = workflow.nodes as Array<Record<string, unknown>> | undefined

  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return { valid: false, workflow, errors: ['No nodes in workflow'] }
  }

  // Fix each node
  for (const node of nodes) {
    if (!node.id) node.id = `node-${Math.random().toString(36).slice(2, 8)}`
    if (!node.type || !VALID_TYPES.has(node.type as string)) {
      errors.push(`Invalid node type: ${node.type}, defaulting to llm`)
      node.type = 'llm'
    }
    if (!node.label) node.label = (node.type as string).charAt(0).toUpperCase() + (node.type as string).slice(1)
    if (!node.category) {
      node.category = getCategoryForNodeType(node.type as string)
    }
    if (!node.config) node.config = {}
    if (!node.position) node.position = { x: 250, y: 50 }

    // Fix category mismatches (except email/whatsapp which are ambiguous)
    const expectedCategory = getCategoryForNodeType(node.type as string, node.category as string)
    if (node.category !== expectedCategory && node.type !== 'email' && node.type !== 'whatsapp') {
      node.category = expectedCategory
    }
  }

  // Ensure trigger node exists
  const hasTrigger = nodes.some(n => n.category === 'trigger')
  if (!hasTrigger) {
    errors.push('No trigger node found — prepending API trigger')
    nodes.unshift({
      id: 'node-trigger',
      type: 'api',
      label: 'API Trigger',
      category: 'trigger',
      config: { method: 'POST', path: '/trigger' },
      position: { x: 250, y: 50 },
    })
    // Shift all other nodes down
    for (let i = 1; i < nodes.length; i++) {
      const pos = nodes[i].position as { x: number; y: number }
      nodes[i].position = { x: pos.x, y: pos.y + 150 }
    }
  }

  // Fix edges
  const edges = (workflow.edges as Array<Record<string, unknown>>) || []
  const nodeIds = new Set(nodes.map(n => n.id))
  const fixedEdges = edges.filter((e) => {
    if (!e.source || !e.target) return false
    if (!nodeIds.has(e.source as string) || !nodeIds.has(e.target as string)) return false
    return true
  })
  for (const edge of fixedEdges) {
    if (!edge.id) edge.id = `edge-${Math.random().toString(36).slice(2, 8)}`
    if (!edge.sourceHandle) edge.sourceHandle = 'default'
    if (!edge.targetHandle) edge.targetHandle = 'input'
  }
  workflow.edges = fixedEdges

  return { valid: errors.length === 0, workflow, errors }
}

// ─── Parse AI Response ────────────────────────────

function parseAIResponse(content: string): Record<string, unknown> | null {
  let cleaned = content.trim()

  // Remove markdown code fences
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  cleaned = cleaned.trim()

  // Try direct parse
  try {
    return JSON.parse(cleaned)
  } catch {
    // Try to find JSON object boundaries
    const startIdx = cleaned.indexOf('{')
    const endIdx = cleaned.lastIndexOf('}')
    if (startIdx >= 0 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.slice(startIdx, endIdx + 1))
      } catch {
        // Failed to parse even with boundary extraction
      }
    }
    return null
  }
}

// ─── POST Handler ─────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { description, existingWorkflow, refinement } = body as {
      description?: string
      existingWorkflow?: Record<string, unknown>
      refinement?: string
    }

    const isRefinement = !!existingWorkflow && !!refinement

    if (!isRefinement && (!description || typeof description !== 'string' || description.trim().length === 0)) {
      return NextResponse.json(
        { ok: false, error: 'Description is required' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()

    // Retry logic — up to 3 attempts for JSON parsing failures
    const MAX_ATTEMPTS = 3
    let lastError: string | null = null

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        let messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>

        if (isRefinement) {
          messages = [
            { role: 'system', content: REFINE_SYSTEM_PROMPT },
            { role: 'user', content: `Existing workflow:\n${JSON.stringify(existingWorkflow, null, 2)}\n\nRequested modification: ${refinement}` },
          ]
        } else {
          messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Generate a workflow for: ${description!.trim()}` },
          ]
        }

        const completion = await zai.chat.completions.create({
          messages,
          model: 'gpt-4o',
          temperature: 0.4,
          max_tokens: 4096,
        })

        const content = completion.choices[0]?.message?.content || ''
        const workflow = parseAIResponse(content)

        if (!workflow) {
          lastError = `AI returned invalid JSON (attempt ${attempt}/${MAX_ATTEMPTS})`
          if (attempt < MAX_ATTEMPTS) continue
          return NextResponse.json(
            { ok: false, error: 'AI generated invalid workflow JSON after multiple attempts. Please try again.', raw: content },
            { status: 422 }
          )
        }

        // Validate and fix the workflow
        const validation = validateAndFixWorkflow(workflow)

        // Add warnings from validation if any
        if (validation.errors.length > 0) {
          workflow._warnings = validation.errors
        }

        return NextResponse.json({
          ok: true,
          data: validation.workflow,
        })
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error'
        if (attempt < MAX_ATTEMPTS) continue
      }
    }

    return NextResponse.json(
      { ok: false, error: lastError || 'Workflow generation failed after multiple attempts' },
      { status: 500 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Workflow generation failed'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
