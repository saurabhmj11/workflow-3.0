// ─── Collaboration Manager ────────────────────────
// Manages WebSocket/SSE connections for real-time workflow editing.
// Features: presence (who's online), cursor positions, live edits,
// conflict resolution via in-memory room-based architecture.
//
// Singleton pattern — imported from API routes and stores alike.

import { createLogger } from '@/lib/logger'

const log = createLogger('CollaborationManager')

// ─── Types ──────────────────────────────────────────

/** A user participating in a collaboration room */
export interface CollabUser {
  id: string
  name: string
  /** Deterministic color assigned from userId hash */
  color: string
  /** Current cursor position on the canvas */
  cursor?: { x: number; y: number; nodeId?: string }
  /** Unix timestamp of last activity */
  lastActive: number
}

/** Events broadcast within a collaboration room */
export interface CollabEvent {
  type: 'join' | 'leave' | 'cursor' | 'node_move' | 'node_update' | 'node_add' | 'node_delete' | 'edge_add' | 'edge_delete' | 'select' | 'chat'
  userId: string
  workflowId: string
  timestamp: number
  data: Record<string, unknown>
}

/** A registered SSE client for a given room */
export interface CollabClient {
  id: string
  userId: string
  workflowId: string
  controller: ReadableStreamDefaultController
}

// ─── Palette of distinct colors for collaborators ──

const COLLAB_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#a855f7', // purple
]

// ─── Deterministic color from userId hash ──────────

function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit int
  }
  return Math.abs(hash)
}

// ─── Singleton Collaboration Manager ───────────────

class CollaborationManager {
  /** workflowId → Map<userId, CollabUser> */
  private rooms: Map<string, Map<string, CollabUser>> = new Map()
  /** clientId → CollabClient — all connected SSE clients */
  private clients: Map<string, CollabClient> = new Map()
  /** workflowId → Set<clientId> — room membership index */
  private roomClients: Map<string, Set<string>> = new Map()

  // ─── Room Management ─────────────────────────────

  /**
   * Add a user to a collaboration room.
   * Broadcasts a 'join' event to other room members.
   */
  joinRoom(workflowId: string, user: CollabUser): void {
    if (!this.rooms.has(workflowId)) {
      this.rooms.set(workflowId, new Map())
      this.roomClients.set(workflowId, new Set())
    }
    const room = this.rooms.get(workflowId)!
    room.set(user.id, { ...user, lastActive: Date.now() })

    log.info({ workflowId, userId: user.id }, 'User joined room')

    // Broadcast join event
    this.broadcastEvent(workflowId, {
      type: 'join',
      userId: user.id,
      workflowId,
      timestamp: Date.now(),
      data: { name: user.name, color: user.color },
    })
  }

  /**
   * Remove a user from a collaboration room.
   * Broadcasts a 'leave' event to remaining members.
   */
  leaveRoom(workflowId: string, userId: string): void {
    const room = this.rooms.get(workflowId)
    if (!room) return

    const user = room.get(userId)
    room.delete(userId)

    // Clean up empty rooms
    if (room.size === 0) {
      this.rooms.delete(workflowId)
      this.roomClients.delete(workflowId)
    }

    log.info({ workflowId, userId }, 'User left room')

    // Broadcast leave event
    this.broadcastEvent(workflowId, {
      type: 'leave',
      userId,
      workflowId,
      timestamp: Date.now(),
      data: {},
    })
  }

  // ─── Cursor Updates ──────────────────────────────

  /**
   * Update a user's cursor position in a room.
   * Broadcasts a 'cursor' event to other room members.
   */
  updateCursor(workflowId: string, userId: string, cursor: CollabUser['cursor']): void {
    const room = this.rooms.get(workflowId)
    if (!room) return

    const user = room.get(userId)
    if (user) {
      user.cursor = cursor
      user.lastActive = Date.now()
    }

    this.broadcastEvent(workflowId, {
      type: 'cursor',
      userId,
      workflowId,
      timestamp: Date.now(),
      data: { cursor: cursor ?? null },
    })
  }

  // ─── Event Broadcasting ──────────────────────────

  /**
   * Broadcast a collaboration event to all SSE clients in the room,
   * except the originating user.
   */
  broadcastEvent(workflowId: string, event: CollabEvent): void {
    const roomClientIds = this.roomClients.get(workflowId)
    if (!roomClientIds) return

    const msg = `event: collab\ndata: ${JSON.stringify(event)}\n\n`
    const encoded = new TextEncoder().encode(msg)

    for (const clientId of roomClientIds) {
      const client = this.clients.get(clientId)
      if (!client) continue
      // Don't send events back to the originating user
      if (client.userId === event.userId && event.type !== 'join' && event.type !== 'leave') continue
      try {
        client.controller.enqueue(encoded)
      } catch {
        // Client disconnected — clean up
        this.removeClient(clientId)
      }
    }
  }

  // ─── Client Management ───────────────────────────

  /**
   * Register an SSE client for a workflow room.
   * Returns the client ID for later cleanup.
   */
  registerClient(client: CollabClient): void {
    this.clients.set(client.id, client)

    if (!this.roomClients.has(client.workflowId)) {
      this.roomClients.set(client.workflowId, new Set())
    }
    this.roomClients.get(client.workflowId)!.add(client.id)

    log.info({ clientId: client.id, workflowId: client.workflowId }, 'SSE client registered')
  }

  /**
   * Remove a client and clean up room membership.
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    this.clients.delete(clientId)

    const roomClientIds = this.roomClients.get(client.workflowId)
    if (roomClientIds) {
      roomClientIds.delete(clientId)
      if (roomClientIds.size === 0) {
        this.roomClients.delete(client.workflowId)
      }
    }

    log.info({ clientId, workflowId: client.workflowId }, 'SSE client removed')
  }

  // ─── Query Methods ───────────────────────────────

  /**
   * Get all users currently in a room.
   */
  getRoomUsers(workflowId: string): CollabUser[] {
    const room = this.rooms.get(workflowId)
    if (!room) return []
    return Array.from(room.values())
  }

  /**
   * Get a deterministic color for a user based on their ID.
   * Ensures the same user always gets the same color.
   */
  getUserColor(userId: string): string {
    return COLLAB_COLORS[hashUserId(userId) % COLLAB_COLORS.length]
  }

  /**
   * Get the number of active rooms.
   */
  getRoomCount(): number {
    return this.rooms.size
  }

  /**
   * Get total number of connected clients.
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Get a specific client by ID.
   */
  getClient(clientId: string): CollabClient | undefined {
    return this.clients.get(clientId)
  }
}

// ─── Export singleton instance ─────────────────────

export const collabManager = new CollaborationManager()
