// ─── Multi-Agent Orchestration System ─────────────
// Enables multiple AI agents to collaborate on tasks with
// message passing, shared state, and configurable patterns
//
// Supported patterns:
// - sequential: Agents execute one after another, passing results forward
// - round-robin: Agents take turns in order, each building on the last
// - supervisor: A coordinator agent delegates tasks and synthesizes results
// - debate: Agents argue different perspectives, then synthesize
// - pipeline: Agents form a processing pipeline, each transforming the output

import { createLogger } from '@/lib/logger'

const log = createLogger('AgentOrchestrator')

// ─── Types ─────────────────────────────────────────

export interface AgentDefinition {
  id: string
  name: string
  role: string       // e.g., "researcher", "writer", "reviewer", "coordinator"
  systemPrompt: string
  model?: string
  tools?: string[]
  maxTurns?: number
  temperature?: number
}

export interface AgentMessage {
  id: string
  fromAgent: string
  toAgent: string | 'broadcast'
  type: 'task' | 'result' | 'question' | 'approval_request' | 'delegation' | 'broadcast'
  content: string
  metadata?: Record<string, unknown>
  timestamp: number
}

export interface OrchestrationState {
  id: string
  agents: AgentDefinition[]
  messages: AgentMessage[]
  sharedState: Record<string, unknown>
  status: 'initialized' | 'running' | 'completed' | 'failed' | 'paused'
  currentTurn: string | null  // Agent ID whose turn it is
  turnOrder: string[]         // Ordered list of agent IDs
  maxRounds: number
  currentRound: number
  result?: unknown
  error?: string
}

export type OrchestrationPattern = 'sequential' | 'round-robin' | 'supervisor' | 'debate' | 'pipeline'

// ─── In-Memory Session Store ───────────────────────

const sessions = new Map<string, OrchestrationState>()

// ─── Helper: Generate unique IDs ──────────────────

function generateId(): string {
  return `orch-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

// ─── Simulated AI Agent Response ───────────────────
// In production, this would call the real AI API.
// For now, returns a deterministic simulated response based on agent role.

function simulateAgentResponse(
  agent: AgentDefinition,
  task: string,
  previousResults: string[]
): string {
  const roleResponses: Record<string, string> = {
    researcher: `Research findings: Based on analysis of the task "${task.slice(0, 100)}", I've identified 3 key insights. ${previousResults.length > 0 ? `Building on previous findings: ${previousResults[previousResults.length - 1]?.slice(0, 100)}...` : ''} The data suggests a clear path forward with supporting evidence from multiple sources.`,
    writer: `Draft response: I've composed a comprehensive response addressing the task "${task.slice(0, 100)}". ${previousResults.length > 0 ? `Incorporating the research: ${previousResults[previousResults.length - 1]?.slice(0, 100)}...` : ''} The content is structured for clarity and impact.`,
    reviewer: `Review assessment: I've evaluated the work on "${task.slice(0, 100)}". ${previousResults.length > 0 ? `Reviewing the draft: ${previousResults[previousResults.length - 1]?.slice(0, 100)}...` : ''} The quality meets standards with 2 minor suggestions for improvement.`,
    coordinator: `Coordination summary: I've synthesized inputs from all agents regarding "${task.slice(0, 100)}". The team has reached a consensus with clear action items. ${previousResults.length > 0 ? `Key decisions: ${previousResults[previousResults.length - 1]?.slice(0, 100)}...` : ''}`,
    critic: `Critical analysis: Examining "${task.slice(0, 100)}" from a contrarian perspective. ${previousResults.length > 0 ? `Challenging assumptions in: ${previousResults[previousResults.length - 1]?.slice(0, 100)}...` : ''} I've identified potential risks and alternative approaches that should be considered.`,
    summarizer: `Summary: The key takeaways from "${task.slice(0, 100)}" are: 1) The primary objective is clear, 2) The approach is sound, 3) Next steps are well-defined. ${previousResults.length > 0 ? `Consolidating: ${previousResults[previousResults.length - 1]?.slice(0, 100)}...` : ''}`,
  }

  // Use role-specific response if available, otherwise generic
  return roleResponses[agent.role] ?? `Agent "${agent.name}" (role: ${agent.role}) processed the task: "${task.slice(0, 100)}". ${previousResults.length > 0 ? `Based on prior context: ${previousResults[previousResults.length - 1]?.slice(0, 100)}...` : ''} Task completed successfully.`
}

// ─── AgentOrchestrator Class ───────────────────────

export class AgentOrchestrator {
  /**
   * Create a new orchestration session with the specified agents and pattern.
   * Returns the initial state of the session.
   */
  createSession(
    agents: AgentDefinition[],
    pattern: OrchestrationPattern,
    config?: Record<string, unknown>
  ): OrchestrationState {
    const id = generateId()

    // Determine turn order based on pattern
    let turnOrder: string[]
    switch (pattern) {
      case 'sequential':
      case 'pipeline':
        // Agents execute in order
        turnOrder = agents.map((a) => a.id)
        break
      case 'supervisor':
        // Coordinator goes first, then others
        const coordinator = agents.find((a) => a.role === 'coordinator')
        const others = agents.filter((a) => a.role !== 'coordinator')
        turnOrder = coordinator ? [coordinator.id, ...others.map((a) => a.id)] : agents.map((a) => a.id)
        break
      case 'debate':
        // Alternate between opposing views
        turnOrder = agents.map((a) => a.id)
        break
      case 'round-robin':
      default:
        turnOrder = agents.map((a) => a.id)
        break
    }

    const maxRounds = (config?.maxRounds as number) ?? 3

    const state: OrchestrationState = {
      id,
      agents,
      messages: [],
      sharedState: { ...config },
      status: 'initialized',
      currentTurn: turnOrder[0] ?? null,
      turnOrder,
      maxRounds,
      currentRound: 0,
    }

    sessions.set(id, state)
    log.info({ sessionId: id, pattern, agentCount: agents.length }, 'Orchestration session created')

    return state
  }

  /**
   * Run the orchestration to completion.
   * Each agent takes turns processing the task based on the pattern.
   */
  async runOrchestration(
    sessionId: string,
    initialTask: string
  ): Promise<OrchestrationState> {
    const state = sessions.get(sessionId)
    if (!state) {
      throw new Error(`Orchestration session "${sessionId}" not found`)
    }

    if (state.status === 'running') {
      throw new Error('Orchestration is already running')
    }

    state.status = 'running'
    state.currentRound = 0

    // Add initial task message
    const initialMessage: AgentMessage = {
      id: generateMessageId(),
      fromAgent: 'system',
      toAgent: 'broadcast',
      type: 'task',
      content: initialTask,
      metadata: { round: 0 },
      timestamp: Date.now(),
    }
    state.messages.push(initialMessage)

    try {
      const results: string[] = []

      for (let round = 0; round < state.maxRounds; round++) {
        state.currentRound = round + 1

        if ((state.status as string) === 'paused') {
          log.info({ sessionId, round }, 'Orchestration paused')
          break
        }

        for (const agentId of state.turnOrder) {
          const agent = state.agents.find((a) => a.id === agentId)
          if (!agent) continue

          state.currentTurn = agentId

          // Simulate agent processing
          const agentResponse = simulateAgentResponse(agent, initialTask, results)
          results.push(agentResponse)

          // Add result message
          const resultMessage: AgentMessage = {
            id: generateMessageId(),
            fromAgent: agentId,
            toAgent: 'broadcast',
            type: 'result',
            content: agentResponse,
            metadata: { round: round + 1 },
            timestamp: Date.now(),
          }
          state.messages.push(resultMessage)

          // Update shared state with agent results
          state.sharedState[`${agentId}_result`] = agentResponse
          state.sharedState[`${agentId}_round_${round + 1}`] = agentResponse

          // Small delay to simulate processing
          await new Promise((resolve) => setTimeout(resolve, 200))

          // Check if paused
          if ((state.status as string) === 'paused') break
        }

        if ((state.status as string) === 'paused') break
      }

      // Synthesize final result based on pattern
      if ((state.status as string) !== 'paused') {
        state.status = 'completed'
        state.currentTurn = null

        // Build the final result
        const lastResults = state.turnOrder.map((id) => {
          const lastMsg = [...state.messages]
            .reverse()
            .find((m) => m.fromAgent === id && m.type === 'result')
          return {
            agentId: id,
            agentName: state.agents.find((a) => a.id === id)?.name ?? id,
            result: lastMsg?.content ?? '',
          }
        })

        state.result = {
          pattern: state.agents.length > 0 ? 'multi-agent' : 'single',
          rounds: state.currentRound,
          agents: lastResults.map((r) => ({ id: r.agentId, name: r.agentName })),
          finalOutput: lastResults[lastResults.length - 1]?.result ?? '',
          allResults: lastResults,
          messageCount: state.messages.length,
        }

        log.info({ sessionId, rounds: state.currentRound, messageCount: state.messages.length }, 'Orchestration completed')
      }
    } catch (err) {
      state.status = 'failed'
      state.error = err instanceof Error ? err.message : 'Orchestration failed'
      log.error({ sessionId, err }, 'Orchestration failed')
    }

    return state
  }

  /**
   * Send a message between agents in a session.
   */
  sendMessage(
    sessionId: string,
    from: string,
    to: string,
    content: string,
    type: AgentMessage['type'] = 'task'
  ): void {
    const state = sessions.get(sessionId)
    if (!state) {
      throw new Error(`Orchestration session "${sessionId}" not found`)
    }

    const message: AgentMessage = {
      id: generateMessageId(),
      fromAgent: from,
      toAgent: to,
      type,
      content,
      timestamp: Date.now(),
    }

    state.messages.push(message)
  }

  /**
   * Get the current state of an orchestration session.
   */
  getState(sessionId: string): OrchestrationState | undefined {
    return sessions.get(sessionId)
  }

  /**
   * Pause a running orchestration.
   */
  pause(sessionId: string): void {
    const state = sessions.get(sessionId)
    if (!state) {
      throw new Error(`Orchestration session "${sessionId}" not found`)
    }

    if (state.status !== 'running') {
      throw new Error('Can only pause a running orchestration')
    }

    state.status = 'paused'
    log.info({ sessionId }, 'Orchestration paused')
  }

  /**
   * Resume a paused orchestration.
   */
  async resume(sessionId: string): Promise<OrchestrationState> {
    const state = sessions.get(sessionId)
    if (!state) {
      throw new Error(`Orchestration session "${sessionId}" not found`)
    }

    if (state.status !== 'paused') {
      throw new Error('Can only resume a paused orchestration')
    }

    state.status = 'running'

    // Continue from where we left off
    // Re-run with the existing task
    const initialMessage = state.messages.find((m) => m.fromAgent === 'system')
    const task = initialMessage?.content ?? ''

    // Resume by re-running the remaining rounds
    const results = state.messages
      .filter((m) => m.type === 'result')
      .map((m) => m.content)

    for (let round = state.currentRound; round < state.maxRounds; round++) {
      state.currentRound = round + 1

      for (const agentId of state.turnOrder) {
        const agent = state.agents.find((a) => a.id === agentId)
        if (!agent) continue

        state.currentTurn = agentId

        const agentResponse = simulateAgentResponse(agent, task, results)
        results.push(agentResponse)

        const resultMessage: AgentMessage = {
          id: generateMessageId(),
          fromAgent: agentId,
          toAgent: 'broadcast',
          type: 'result',
          content: agentResponse,
          metadata: { round: round + 1 },
          timestamp: Date.now(),
        }
        state.messages.push(resultMessage)

        state.sharedState[`${agentId}_result`] = agentResponse

        await new Promise((resolve) => setTimeout(resolve, 200))

        if ((state.status as string) === 'paused') break
      }

      if ((state.status as string) === 'paused') break
    }

    if ((state.status as string) !== 'paused') {
      state.status = 'completed'
      state.currentTurn = null

      const lastResults = state.turnOrder.map((id) => {
        const lastMsg = [...state.messages]
          .reverse()
          .find((m) => m.fromAgent === id && m.type === 'result')
        return {
          agentId: id,
          agentName: state.agents.find((a) => a.id === id)?.name ?? id,
          result: lastMsg?.content ?? '',
        }
      })

      state.result = {
        pattern: 'multi-agent',
        rounds: state.currentRound,
        agents: lastResults.map((r) => ({ id: r.agentId, name: r.agentName })),
        finalOutput: lastResults[lastResults.length - 1]?.result ?? '',
        allResults: lastResults,
        messageCount: state.messages.length,
      }
    }

    return state
  }

  /**
   * List all active sessions.
   */
  listSessions(): OrchestrationState[] {
    return Array.from(sessions.values())
  }

  /**
   * Delete a session.
   */
  deleteSession(sessionId: string): boolean {
    return sessions.delete(sessionId)
  }
}

// ─── Singleton Export ──────────────────────────────

export const agentOrchestrator = new AgentOrchestrator()
