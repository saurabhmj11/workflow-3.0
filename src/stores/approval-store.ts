import { create } from 'zustand'
import type { ApprovalRequest, ApprovalStatus } from '@/lib/types'

interface ApprovalState {
  requests: ApprovalRequest[]
  addRequest: (request: ApprovalRequest) => void
  updateStatus: (id: string, status: ApprovalStatus, notes?: string) => void
  getPending: () => ApprovalRequest[]
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  requests: [],

  addRequest: (request) => {
    set((s) => ({ requests: [request, ...s.requests] }))
  },

  updateStatus: (id, status, notes) => {
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id ? { ...r, status, notes: notes ?? r.notes } : r
      ),
    }))
  },

  getPending: () => get().requests.filter((r) => r.status === 'pending'),
}))
