import { create } from 'zustand'
import type { ApprovalRequest, ApprovalStatus } from '@/lib/types'

interface ApprovalState {
  requests: ApprovalRequest[]
  isHydrated: boolean
  addRequest: (request: ApprovalRequest) => void
  updateStatus: (id: string, status: ApprovalStatus, notes?: string) => void
  getPending: () => ApprovalRequest[]
  hydrateFromDB: () => Promise<void>
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  requests: [],
  isHydrated: false,

  addRequest: (request) => {
    set((s) => ({ requests: [request, ...s.requests] }))

    // Persist to DB (non-blocking)
    fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: request.id,
        runId: request.runId || 'unknown',
        nodeId: request.nodeId,
        workflowId: request.workflowId || 'unknown',
        assignee: request.assignee || undefined,
        status: 'pending',
        context: request.context,
        slaDeadline: request.slaDeadline,
      }),
    }).catch(() => {
      // Silently fail — the store still works in-memory
    })
  },

  updateStatus: (id, status, notes) => {
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status, notes: notes ?? r.notes } : r
      ),
    }))

    // Persist status update to DB (non-blocking)
    fetch('/api/approvals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, notes }),
    }).catch(() => {
      // Silently fail
    })
  },

  getPending: () => get().requests.filter((r) => r.status === 'pending'),

  hydrateFromDB: async () => {
    if (get().isHydrated) return

    try {
      const res = await fetch('/api/approvals')
      const json = await res.json()

      if (json.ok && Array.isArray(json.data)) {
        const requests: ApprovalRequest[] = json.data
          .filter((a: any) => a.status === 'pending')
          .map((a: any) => ({
            id: a.id,
            runId: a.runId,
            nodeId: a.nodeId,
            workflowId: a.workflowId,
            assignee: a.assignee || undefined,
            status: a.status as ApprovalStatus,
            context: a.context || {},
            createdAt: a.createdAt,
            slaDeadline: a.slaDeadline || undefined,
            notes: a.notes || undefined,
          }))

        set({ requests, isHydrated: true })
      }
    } catch {
      // Hydration failed — continue with empty store
      set({ isHydrated: true })
    }
  },
}))
