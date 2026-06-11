// ─── Collaboration Zustand Store ──────────────────
// Client-side state management for real-time collaboration.
// Manages SSE connection, presence tracking, cursor positions,
// and event dispatching.

import { create } from 'zustand'
import type { CollabUser, CollabEvent } from '@/lib/collaboration'

// ─── Types ──────────────────────────────────────────

interface CollaborationState {
  /** Users currently in the same workflow room */
  activeUsers: CollabUser[]
  /** Whether the SSE connection is active */
  isConnected: boolean
  /** Current user's ID in the room */
  myUserId: string | null
  /** Current user's assigned color */
  myColor: string | null
  /** Recent collaboration events (capped for memory) */
  events: CollabEvent[]
  /** The current workflow room ID */
  currentWorkflowId: string | null

  // ─── Actions ───────────────────────────────────

  /** Connect to a collaboration room via SSE */
  connect: (workflowId: string, userId: string, userName?: string) => void
  /** Disconnect from the current room */
  disconnect: () => void
  /** Send a cursor position update */
  sendCursorUpdate: (cursor: { x: number; y: number; nodeId?: string }) => void
  /** Send a node update event */
  sendNodeUpdate: (nodeId: string, changes: Record<string, unknown>) => void
  /** Send a node move event */
  sendNodeMove: (nodeId: string, position: { x: number; y: number }) => void
  /** Send a node add event */
  sendNodeAdd: (nodeId: string, nodeData: Record<string, unknown>) => void
  /** Send a node delete event */
  sendNodeDelete: (nodeId: string) => void
  /** Send an edge add event */
  sendEdgeAdd: (edgeId: string, edgeData: Record<string, unknown>) => void
  /** Send an edge delete event */
  sendEdgeDelete: (edgeId: string) => void
  /** Send a selection event */
  sendSelect: (nodeId: string | null) => void
  /** Send a chat message */
  sendChatMessage: (message: string) => void
}

// ─── Max events to keep in memory ──────────────────

const MAX_EVENTS = 100

// ─── Store ──────────────────────────────────────────

let eventSourceRef: EventSource | null = null

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  activeUsers: [],
  isConnected: false,
  myUserId: null,
  myColor: null,
  events: [],
  currentWorkflowId: null,

  connect: (workflowId, userId, userName = 'Anonymous') => {
    // Disconnect any existing connection
    get().disconnect()

    const params = new URLSearchParams({
      workflowId,
      userId,
      userName,
    })
    const es = new EventSource(`/api/collaboration?${params.toString()}`)
    eventSourceRef = es

    es.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        set({
          isConnected: true,
          myUserId: userId,
          myColor: data.color,
          currentWorkflowId: workflowId,
          activeUsers: data.users ?? [],
        })
      } catch {
        set({ isConnected: true, myUserId: userId, currentWorkflowId: workflowId })
      }
    })

    es.addEventListener('collab', (e) => {
      try {
        const event: CollabEvent = JSON.parse((e as MessageEvent).data)
        const state = get()

        // Update active users list on join/leave
        if (event.type === 'join') {
          const exists = state.activeUsers.some(u => u.id === event.userId)
          if (!exists) {
            set({
              activeUsers: [...state.activeUsers, {
                id: event.userId,
                name: (event.data.name as string) ?? 'Anonymous',
                color: (event.data.color as string) ?? '#8b5cf6',
                lastActive: event.timestamp,
              }],
            })
          }
        } else if (event.type === 'leave') {
          set({
            activeUsers: state.activeUsers.filter(u => u.id !== event.userId),
          })
        } else if (event.type === 'cursor') {
          // Update cursor for the user
          set({
            activeUsers: state.activeUsers.map(u =>
              u.id === event.userId
                ? { ...u, cursor: (event.data.cursor as CollabUser['cursor']) ?? undefined, lastActive: event.timestamp }
                : u
            ),
          })
        }

        // Append event to the list
        set({
          events: [...state.events.slice(-(MAX_EVENTS - 1)), event],
        })
      } catch {
        // Ignore malformed events
      }
    })

    es.addEventListener('heartbeat', () => {
      // Connection is alive
    })

    es.onerror = () => {
      set({ isConnected: false })
      // EventSource will auto-reconnect
    }
  },

  disconnect: () => {
    if (eventSourceRef) {
      eventSourceRef.close()
      eventSourceRef = null
    }
    set({
      activeUsers: [],
      isConnected: false,
      myUserId: null,
      myColor: null,
      events: [],
      currentWorkflowId: null,
    })
  },

  sendCursorUpdate: (cursor) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'cursor',
      data: { cursor },
    })
  },

  sendNodeUpdate: (nodeId, changes) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'node_update',
      data: { nodeId, changes },
    })
  },

  sendNodeMove: (nodeId, position) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'node_move',
      data: { nodeId, position },
    })
  },

  sendNodeAdd: (nodeId, nodeData) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'node_add',
      data: { nodeId, ...nodeData },
    })
  },

  sendNodeDelete: (nodeId) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'node_delete',
      data: { nodeId },
    })
  },

  sendEdgeAdd: (edgeId, edgeData) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'edge_add',
      data: { edgeId, ...edgeData },
    })
  },

  sendEdgeDelete: (edgeId) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'edge_delete',
      data: { edgeId },
    })
  },

  sendSelect: (nodeId) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'select',
      data: { nodeId },
    })
  },

  sendChatMessage: (message) => {
    const state = get()
    if (!state.currentWorkflowId || !state.myUserId) return
    postEvent(state.currentWorkflowId, state.myUserId, {
      type: 'chat',
      data: { message },
    })
  },
}))

// ─── Helper: POST event to broadcaster ────────────

async function postEvent(
  workflowId: string,
  userId: string,
  event: { type: CollabEvent['type']; data: Record<string, unknown> }
) {
  try {
    await fetch('/api/collaboration/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId,
        userId,
        event: {
          ...event,
          userId,
          workflowId,
          timestamp: Date.now(),
        },
      }),
    })
  } catch {
    // Silently fail — collaboration is best-effort
  }
}
