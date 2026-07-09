// ─── Approval Store Tests ─────────────────────────
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApprovalStore } from '@/stores/approval-store'
import type { ApprovalRequest } from '@/lib/types'

// Mock global fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function makeRequest(overrides: Partial<ApprovalRequest> = {}): ApprovalRequest {
  return {
    id: 'req-1',
    runId: 'run-1',
    nodeId: 'node-1',
    workflowId: 'wf-1',
    status: 'pending',
    context: { nodeLabel: 'Approve Email' },
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('ApprovalStore', () => {
  beforeEach(() => {
    // Reset the store to initial state
    const store = useApprovalStore.getState()
    useApprovalStore.setState({
      requests: [],
      isHydrated: false,
    })
    mockFetch.mockReset()
    // Default: fetch succeeds silently
    mockFetch.mockResolvedValue({ ok: true })
  })

  // ─── Initial State ─────────────────────────────

  describe('initial state', () => {
    it('should start with empty requests', () => {
      const store = useApprovalStore.getState()
      expect(store.requests).toEqual([])
    })

    it('should start with isHydrated as false', () => {
      const store = useApprovalStore.getState()
      expect(store.isHydrated).toBe(false)
    })
  })

  // ─── addRequest ────────────────────────────────

  describe('addRequest', () => {
    it('should add a pending request', () => {
      const request = makeRequest()
      useApprovalStore.getState().addRequest(request)

      const store = useApprovalStore.getState()
      expect(store.requests).toHaveLength(1)
      expect(store.requests[0].id).toBe('req-1')
      expect(store.requests[0].status).toBe('pending')
    })

    it('should prepend the request to the list', () => {
      const req1 = makeRequest({ id: 'req-1' })
      const req2 = makeRequest({ id: 'req-2' })

      useApprovalStore.getState().addRequest(req1)
      useApprovalStore.getState().addRequest(req2)

      const store = useApprovalStore.getState()
      expect(store.requests).toHaveLength(2)
      expect(store.requests[0].id).toBe('req-2') // Most recent first
      expect(store.requests[1].id).toBe('req-1')
    })

    it('should persist to DB via fetch POST', () => {
      const request = makeRequest()
      useApprovalStore.getState().addRequest(request)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/approvals',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('should not fail if fetch rejects (non-blocking)', () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const request = makeRequest()

      // Should not throw
      expect(() => useApprovalStore.getState().addRequest(request)).not.toThrow()

      const store = useApprovalStore.getState()
      expect(store.requests).toHaveLength(1)
    })

    it('should add multiple requests', () => {
      const req1 = makeRequest({ id: 'req-1', nodeId: 'node-1' })
      const req2 = makeRequest({ id: 'req-2', nodeId: 'node-2' })
      const req3 = makeRequest({ id: 'req-3', nodeId: 'node-3' })

      useApprovalStore.getState().addRequest(req1)
      useApprovalStore.getState().addRequest(req2)
      useApprovalStore.getState().addRequest(req3)

      expect(useApprovalStore.getState().requests).toHaveLength(3)
    })
  })

  // ─── updateStatus ──────────────────────────────

  describe('updateStatus', () => {
    it('should update request status to approved', () => {
      const request = makeRequest()
      useApprovalStore.getState().addRequest(request)
      useApprovalStore.getState().updateStatus('req-1', 'approved')

      const store = useApprovalStore.getState()
      expect(store.requests[0].status).toBe('approved')
    })

    it('should update request status to rejected', () => {
      const request = makeRequest()
      useApprovalStore.getState().addRequest(request)
      useApprovalStore.getState().updateStatus('req-1', 'rejected')

      const store = useApprovalStore.getState()
      expect(store.requests[0].status).toBe('rejected')
    })

    it('should update notes when provided', () => {
      const request = makeRequest()
      useApprovalStore.getState().addRequest(request)
      useApprovalStore.getState().updateStatus('req-1', 'approved', 'Looks good')

      const store = useApprovalStore.getState()
      expect(store.requests[0].notes).toBe('Looks good')
    })

    it('should preserve existing notes when notes not provided', () => {
      const request = makeRequest({ notes: 'Original note' })
      useApprovalStore.getState().addRequest(request)
      useApprovalStore.getState().updateStatus('req-1', 'approved')

      const store = useApprovalStore.getState()
      expect(store.requests[0].notes).toBe('Original note')
    })

    it('should persist status update to DB via fetch PUT', () => {
      const request = makeRequest()
      useApprovalStore.getState().addRequest(request)
      mockFetch.mockClear()

      useApprovalStore.getState().updateStatus('req-1', 'approved', 'LGTM')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/approvals',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('approved'),
        })
      )
    })

    it('should not affect other requests', () => {
      const req1 = makeRequest({ id: 'req-1' })
      const req2 = makeRequest({ id: 'req-2' })
      useApprovalStore.getState().addRequest(req1)
      useApprovalStore.getState().addRequest(req2)

      useApprovalStore.getState().updateStatus('req-1', 'approved')

      const store = useApprovalStore.getState()
      const updated = store.requests.find((r) => r.id === 'req-1')
      const untouched = store.requests.find((r) => r.id === 'req-2')
      expect(updated?.status).toBe('approved')
      expect(untouched?.status).toBe('pending')
    })

    it('should handle updating a non-existent request gracefully', () => {
      const request = makeRequest()
      useApprovalStore.getState().addRequest(request)

      // Should not throw
      expect(() => useApprovalStore.getState().updateStatus('non-existent', 'approved')).not.toThrow()
    })
  })

  // ─── getPending ────────────────────────────────

  describe('getPending', () => {
    it('should return only pending requests', () => {
      const req1 = makeRequest({ id: 'req-1', status: 'pending' })
      const req2 = makeRequest({ id: 'req-2', status: 'approved' })
      const req3 = makeRequest({ id: 'req-3', status: 'pending' })

      useApprovalStore.getState().addRequest(req1)
      useApprovalStore.getState().addRequest(req2)
      useApprovalStore.getState().addRequest(req3)

      const pending = useApprovalStore.getState().getPending()
      expect(pending).toHaveLength(2)
      expect(pending.every((r) => r.status === 'pending')).toBe(true)
    })

    it('should return empty array when no pending requests', () => {
      const req1 = makeRequest({ status: 'approved' })
      useApprovalStore.getState().addRequest(req1)

      const pending = useApprovalStore.getState().getPending()
      expect(pending).toEqual([])
    })

    it('should return empty array when no requests at all', () => {
      const pending = useApprovalStore.getState().getPending()
      expect(pending).toEqual([])
    })
  })

  // ─── Filtering pending vs resolved ─────────────

  describe('filtering pending vs resolved', () => {
    it('should filter out approved requests from getPending', () => {
      const req = makeRequest({ id: 'req-a', status: 'pending' })
      useApprovalStore.getState().addRequest(req)
      useApprovalStore.getState().updateStatus('req-a', 'approved')

      const pending = useApprovalStore.getState().getPending()
      expect(pending).toHaveLength(0)
    })

    it('should filter out rejected requests from getPending', () => {
      const req = makeRequest({ id: 'req-b', status: 'pending' })
      useApprovalStore.getState().addRequest(req)
      useApprovalStore.getState().updateStatus('req-b', 'rejected')

      const pending = useApprovalStore.getState().getPending()
      expect(pending).toHaveLength(0)
    })

    it('should filter out expired requests from getPending', () => {
      const req = makeRequest({ id: 'req-c', status: 'pending' })
      useApprovalStore.getState().addRequest(req)
      useApprovalStore.getState().updateStatus('req-c', 'expired')

      const pending = useApprovalStore.getState().getPending()
      expect(pending).toHaveLength(0)
    })

    it('should still keep resolved requests in the full list', () => {
      const req = makeRequest({ status: 'pending' })
      useApprovalStore.getState().addRequest(req)
      useApprovalStore.getState().updateStatus('req-1', 'approved')

      const store = useApprovalStore.getState()
      expect(store.requests).toHaveLength(1)
      expect(store.requests[0].status).toBe('approved')
    })
  })

  // ─── hydrateFromDB ─────────────────────────────

  describe('hydrateFromDB', () => {
    it('should hydrate pending requests from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            data: [
              {
                id: 'db-1',
                nodeId: 'node-1',
                status: 'pending',
                context: { nodeLabel: 'Approve Action', approvalType: 'approval' },
                slaDeadline: null,
              },
            ],
          }),
      })

      await useApprovalStore.getState().hydrateFromDB()

      const store = useApprovalStore.getState()
      expect(store.isHydrated).toBe(true)
      expect(store.requests).toHaveLength(1)
      expect(store.requests[0].id).toBe('db-1')
    })

    it('should filter only pending requests from DB', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            data: [
              {
                id: 'db-pending',
                nodeId: 'node-1',
                status: 'pending',
                context: { nodeLabel: 'Pending Task' },
                slaDeadline: null,
              },
              {
                id: 'db-approved',
                nodeId: 'node-2',
                status: 'approved',
                context: { nodeLabel: 'Approved Task' },
                slaDeadline: null,
              },
            ],
          }),
      })

      await useApprovalStore.getState().hydrateFromDB()

      const store = useApprovalStore.getState()
      expect(store.requests).toHaveLength(1)
      expect(store.requests[0].id).toBe('db-pending')
    })

    it('should not re-hydrate if already hydrated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            data: [],
          }),
      })

      await useApprovalStore.getState().hydrateFromDB()
      expect(useApprovalStore.getState().isHydrated).toBe(true)

      // Reset mock and try hydrating again
      mockFetch.mockClear()
      await useApprovalStore.getState().hydrateFromDB()
      // Should NOT have called fetch again
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should set isHydrated to true even when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await useApprovalStore.getState().hydrateFromDB()

      const store = useApprovalStore.getState()
      expect(store.isHydrated).toBe(true)
      expect(store.requests).toEqual([])
    })

    it('should not set isHydrated when response json.ok is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: false }),
      })

      await useApprovalStore.getState().hydrateFromDB()

      // When json.ok is false, the if-block is skipped, so isHydrated stays false
      const store = useApprovalStore.getState()
      expect(store.isHydrated).toBe(false)
    })
  })
})
