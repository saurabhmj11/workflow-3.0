// ─── Execution Store Tests ────────────────────────
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useExecutionStore } from '@/stores/execution-store'
import type { NodeExecutionStep } from '@/lib/types'

function makeStep(overrides: Partial<NodeExecutionStep> = {}): NodeExecutionStep {
  return {
    nodeId: 'node-1',
    nodeType: 'llm',
    label: 'LLM Node',
    startedAt: new Date().toISOString(),
    status: 'running',
    input: {},
    ...overrides,
  }
}

describe('ExecutionStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useExecutionStore.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper: flush pending batched steps
  async function flushPending() {
    await vi.advanceTimersByTimeAsync(100)
  }

  // ─── startRun ──────────────────────────────────

  describe('startRun', () => {
    it('should initialize a run and return a runId', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')

      expect(runId).toBeTruthy()
      expect(runId).toMatch(/^run-/)
    })

    it('should set isRunning to true', () => {
      useExecutionStore.getState().startRun('wf-1')
      expect(useExecutionStore.getState().isRunning).toBe(true)
    })

    it('should set currentRunId to the new run ID', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      expect(useExecutionStore.getState().currentRunId).toBe(runId)
    })

    it('should create an ExecutionResult with status running', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')

      const store = useExecutionStore.getState()
      const result = store.results.find((r) => r.runId === runId)
      expect(result).toBeDefined()
      expect(result?.status).toBe('running')
      expect(result?.workflowId).toBe('wf-1')
    })

    it('should set activeResultId to the new run ID', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      expect(useExecutionStore.getState().activeResultId).toBe(runId)
    })

    it('should reset nodeStatusMap to empty', () => {
      useExecutionStore.getState().startRun('wf-1')
      expect(useExecutionStore.getState().nodeStatusMap).toEqual({})
    })

    it('should increment run counter for unique IDs', () => {
      const runId1 = useExecutionStore.getState().startRun('wf-1')
      const runId2 = useExecutionStore.getState().startRun('wf-2')
      expect(runId1).not.toBe(runId2)
    })

    it('should trim old results beyond MAX_RESULTS (20)', () => {
      // Start 21 runs
      const runIds: string[] = []
      for (let i = 0; i < 21; i++) {
        const runId = useExecutionStore.getState().startRun(`wf-${i}`)
        useExecutionStore.getState().completeRun(runId, { status: 'success' })
        runIds.push(runId)
      }

      // Should have at most 20 results
      expect(useExecutionStore.getState().results.length).toBeLessThanOrEqual(20)
    })
  })

  // ─── updateStep ────────────────────────────────

  describe('updateStep', () => {
    it('should queue a step for batched processing', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      const step = makeStep({ nodeId: 'node-1', status: 'running' })

      useExecutionStore.getState().updateStep(runId, step)

      // Step is queued but not yet flushed — results shouldn't be updated yet
      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.steps).toHaveLength(0)
    })

    it('should update results after flush interval', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      const step = makeStep({ nodeId: 'node-1', status: 'running' })

      useExecutionStore.getState().updateStep(runId, step)
      await flushPending()

      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.steps).toHaveLength(1)
      expect(result?.steps[0].nodeId).toBe('node-1')
    })

    it('should update an existing step for the same node after flush', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      const step1 = makeStep({ nodeId: 'node-1', status: 'running' })
      const step2 = makeStep({ nodeId: 'node-1', status: 'success', output: { text: 'Done' } })

      useExecutionStore.getState().updateStep(runId, step1)
      await flushPending()

      useExecutionStore.getState().updateStep(runId, step2)
      await flushPending()

      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.steps).toHaveLength(1)
      expect(result?.steps[0].status).toBe('success')
    })

    it('should add multiple different node steps by flushing between each', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')

      // Add step for node-1 and flush
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'running' }))
      await flushPending()

      // Add step for node-2 and flush
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-2', status: 'running' }))
      await flushPending()

      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.steps).toHaveLength(2)
    })
  })

  // ─── completeRun ───────────────────────────────

  describe('completeRun', () => {
    it('should set isRunning to false', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().completeRun(runId, { status: 'success' })

      expect(useExecutionStore.getState().isRunning).toBe(false)
    })

    it('should clear currentRunId', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().completeRun(runId, { status: 'success' })

      expect(useExecutionStore.getState().currentRunId).toBeNull()
    })

    it('should update the result with provided fields', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'success' }))
      await flushPending()

      useExecutionStore.getState().completeRun(runId, {
        status: 'success',
        totalDurationMs: 1500,
        totalCostUsd: 0.003,
      })

      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.status).toBe('success')
      expect(result?.totalDurationMs).toBe(1500)
      expect(result?.totalCostUsd).toBe(0.003)
    })

    it('should set finishedAt timestamp', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().completeRun(runId, { status: 'error' })

      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.finishedAt).toBeTruthy()
    })

    it('should flush pending steps before completing', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'success' }))

      // Don't manually flush — completeRun should flush automatically
      useExecutionStore.getState().completeRun(runId, { status: 'success' })

      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.steps).toHaveLength(1)
    })

    it('should handle completing a non-existent run gracefully', () => {
      expect(() => {
        useExecutionStore.getState().completeRun('non-existent', { status: 'error' })
      }).not.toThrow()
    })
  })

  // ─── nodeStatusMap ─────────────────────────────

  describe('nodeStatusMap', () => {
    it('should be empty when no active result', () => {
      expect(useExecutionStore.getState().nodeStatusMap).toEqual({})
    })

    it('should map nodeId to status for active result steps', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')

      // Add steps one at a time, flushing between each
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'success' }))
      await flushPending()

      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-2', status: 'running' }))
      await flushPending()

      // After flush, nodeStatusMap should be updated
      const statusMap = useExecutionStore.getState().nodeStatusMap
      expect(statusMap['node-1']).toBe('success')
      expect(statusMap['node-2']).toBe('running')
    })

    it('should update when completeRun is called', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')

      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'success' }))
      await flushPending()

      useExecutionStore.getState().completeRun(runId, { status: 'success' })

      const statusMap = useExecutionStore.getState().nodeStatusMap
      expect(statusMap['node-1']).toBe('success')
    })

    it('should be empty after reset', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().completeRun(runId, { status: 'success' })

      useExecutionStore.getState().reset()
      expect(useExecutionStore.getState().nodeStatusMap).toEqual({})
    })
  })

  // ─── forceResetRunning ─────────────────────────

  describe('forceResetRunning', () => {
    it('should force reset isRunning to false', () => {
      useExecutionStore.getState().startRun('wf-1')
      expect(useExecutionStore.getState().isRunning).toBe(true)

      useExecutionStore.getState().forceResetRunning()
      expect(useExecutionStore.getState().isRunning).toBe(false)
    })

    it('should clear currentRunId', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      expect(useExecutionStore.getState().currentRunId).toBe(runId)

      useExecutionStore.getState().forceResetRunning()
      expect(useExecutionStore.getState().currentRunId).toBeNull()
    })

    it('should not throw when no run is active', () => {
      expect(() => useExecutionStore.getState().forceResetRunning()).not.toThrow()
    })
  })

  // ─── setActiveResult ───────────────────────────

  describe('setActiveResult', () => {
    it('should change the active result ID', async () => {
      const runId1 = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().completeRun(runId1, { status: 'success' })

      const runId2 = useExecutionStore.getState().startRun('wf-2')
      useExecutionStore.getState().completeRun(runId2, { status: 'success' })

      useExecutionStore.getState().setActiveResult(runId1)
      expect(useExecutionStore.getState().activeResultId).toBe(runId1)

      // nodeStatusMap should reflect the active result
      expect(useExecutionStore.getState().nodeStatusMap).toBeDefined()
    })

    it('should set activeResultId to null', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().completeRun(runId, { status: 'success' })

      useExecutionStore.getState().setActiveResult(null)
      expect(useExecutionStore.getState().activeResultId).toBeNull()
      expect(useExecutionStore.getState().nodeStatusMap).toEqual({})
    })
  })

  // ─── reset ─────────────────────────────────────

  describe('reset', () => {
    it('should clear all state', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'success' }))
      await flushPending()
      useExecutionStore.getState().completeRun(runId, { status: 'success' })

      useExecutionStore.getState().reset()

      const store = useExecutionStore.getState()
      expect(store.isRunning).toBe(false)
      expect(store.currentRunId).toBeNull()
      expect(store.results).toEqual([])
      expect(store.activeResultId).toBeNull()
      expect(store.nodeStatusMap).toEqual({})
    })
  })

  // ─── Batched update behavior ───────────────────

  describe('batched update behavior', () => {
    it('should delay state updates until flush interval', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')

      // Queue a step
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'running' }))

      // Before flush, steps are not applied
      let result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.steps).toHaveLength(0)

      // After flush, the step should be applied
      await flushPending()

      result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.steps).toHaveLength(1)
    })

    it('should keep only the latest step per runId when batched (same runId overwrites)', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')

      // The pendingSteps Map uses runId as the key, so calling updateStep
      // twice for the same runId without flushing overwrites the previous step
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'running' }))
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-2', status: 'success' }))

      await flushPending()

      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      // Only the last step (node-2) is kept since both used the same runId key
      expect(result?.steps).toHaveLength(1)
      expect(result?.steps[0].nodeId).toBe('node-2')
      expect(result?.steps[0].status).toBe('success')
    })

    it('should use latest step for the same node when steps are flushed sequentially', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')

      // Queue two steps for the same node — flush between each
      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'running' }))
      await flushPending()

      useExecutionStore.getState().updateStep(runId, makeStep({ nodeId: 'node-1', status: 'success', output: 'done' }))
      await flushPending()

      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.steps).toHaveLength(1)
      expect(result?.steps[0].status).toBe('success')
    })
  })

  // ─── Safety timeout behavior ───────────────────

  describe('safety timeout behavior', () => {
    it('should force complete run after timeout (60s)', async () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      expect(useExecutionStore.getState().isRunning).toBe(true)

      // Advance past 60 second safety timeout
      vi.advanceTimersByTime(60_100)

      // The safety timeout should have force-completed the run
      expect(useExecutionStore.getState().isRunning).toBe(false)
    })

    it('should clear safety timer when run completes normally', () => {
      const runId = useExecutionStore.getState().startRun('wf-1')
      useExecutionStore.getState().completeRun(runId, { status: 'success' })

      // Advance past safety timeout — should not cause issues
      vi.advanceTimersByTime(60_100)

      expect(useExecutionStore.getState().isRunning).toBe(false)
      // Results should still be valid (not overwritten)
      const result = useExecutionStore.getState().results.find((r) => r.runId === runId)
      expect(result?.status).toBe('success')
    })
  })
})
