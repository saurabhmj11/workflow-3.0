// ─── Agent Session API ────────────────────────────
// GET: Get orchestration session state
// POST: Send a message / resume a paused session

import { successResponse, errorResponse } from '@/lib/api-utils'
import { agentOrchestrator } from '@/lib/agent-orchestrator'

// ─── GET /api/agents/sessions/[sessionId] ──────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const state = agentOrchestrator.getState(sessionId)

    if (!state) {
      return errorResponse('Session not found', 404)
    }

    return successResponse({
      id: state.id,
      status: state.status,
      agents: state.agents.map((a) => ({ id: a.id, name: a.name, role: a.role })),
      currentTurn: state.currentTurn,
      currentRound: state.currentRound,
      maxRounds: state.maxRounds,
      messages: state.messages.map((m) => ({
        id: m.id,
        fromAgent: m.fromAgent,
        toAgent: m.toAgent,
        type: m.type,
        content: m.content,
        metadata: m.metadata,
        timestamp: m.timestamp,
      })),
      sharedState: state.sharedState,
      result: state.result,
      error: state.error,
    })
  } catch (err) {
    console.error('[GET /api/agents/sessions/[sessionId]]', err)
    return errorResponse('Failed to fetch session state', 500)
  }
}

// ─── POST /api/agents/sessions/[sessionId] ─────────
// Actions: resume, sendMessage, pause

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const body = await request.json()
    const { action, from, to, content, type } = body

    if (!action) {
      return errorResponse('action is required (resume, sendMessage, pause)', 400)
    }

    switch (action) {
      case 'resume': {
        const result = await agentOrchestrator.resume(sessionId)
        return successResponse({
          id: result.id,
          status: result.status,
          currentRound: result.currentRound,
          result: result.result,
          error: result.error,
        })
      }

      case 'sendMessage': {
        if (!from || !to || !content) {
          return errorResponse('from, to, and content are required for sendMessage', 400)
        }
        agentOrchestrator.sendMessage(sessionId, from, to, content, type)
        const state = agentOrchestrator.getState(sessionId)
        return successResponse({
          id: state?.id,
          status: state?.status,
          messageCount: state?.messages.length,
        })
      }

      case 'pause': {
        agentOrchestrator.pause(sessionId)
        const state = agentOrchestrator.getState(sessionId)
        return successResponse({
          id: state?.id,
          status: state?.status,
          currentRound: state?.currentRound,
        })
      }

      default:
        return errorResponse(`Invalid action: ${action}. Supported: resume, sendMessage, pause`, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process session action'
    console.error('[POST /api/agents/sessions/[sessionId]]', err)
    return errorResponse(message, 400)
  }
}
