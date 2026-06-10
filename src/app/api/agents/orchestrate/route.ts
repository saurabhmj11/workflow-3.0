// ─── Agent Orchestration API ──────────────────────
// POST: Start a new multi-agent orchestration session
//   Body: { agents: AgentDefinition[], pattern: OrchestrationPattern, task: string, config? }

import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCurrentUserId } from '@/lib/auth-utils'
import { agentOrchestrator, type OrchestrationPattern, type AgentDefinition } from '@/lib/agent-orchestrator'

// ─── POST /api/agents/orchestrate ──────────────────

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const body = await request.json()

    const { agents, pattern, task, config } = body as {
      agents: AgentDefinition[]
      pattern: OrchestrationPattern
      task: string
      config?: Record<string, unknown>
    }

    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return errorResponse('At least one agent definition is required', 400)
    }

    if (!pattern) {
      return errorResponse('Orchestration pattern is required', 400)
    }

    const validPatterns: OrchestrationPattern[] = ['sequential', 'round-robin', 'supervisor', 'debate', 'pipeline']
    if (!validPatterns.includes(pattern)) {
      return errorResponse(`Invalid pattern. Must be one of: ${validPatterns.join(', ')}`, 400)
    }

    if (!task || typeof task !== 'string') {
      return errorResponse('A task string is required', 400)
    }

    // Validate agent definitions
    for (const agent of agents) {
      if (!agent.id || !agent.name || !agent.role || !agent.systemPrompt) {
        return errorResponse('Each agent must have id, name, role, and systemPrompt', 400)
      }
    }

    // Create the session
    const session = agentOrchestrator.createSession(agents, pattern, {
      ...config,
      userId,
    })

    // Run the orchestration (async — this could be long-running)
    const result = await agentOrchestrator.runOrchestration(session.id, task)

    return successResponse({
      id: result.id,
      status: result.status,
      agents: result.agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
      currentRound: result.currentRound,
      maxRounds: result.maxRounds,
      messages: result.messages.map((m) => ({
        id: m.id,
        fromAgent: m.fromAgent,
        toAgent: m.toAgent,
        type: m.type,
        content: m.content,
        timestamp: m.timestamp,
      })),
      result: result.result,
      error: result.error,
    }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start orchestration'
    console.error('[POST /api/agents/orchestrate]', err)
    return errorResponse(message, 400)
  }
}
