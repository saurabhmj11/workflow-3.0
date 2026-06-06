import { create } from 'zustand'
import type { ExecutionResult, NodeExecutionStep, NodeExecutionStatus } from '@/lib/types'

interface ExecutionState {
  isRunning: boolean
  currentRunId: string | null
  results: ExecutionResult[]
  activeResultId: string | null
  /** Cached node status map for the active run — avoids recalculating on every render */
  nodeStatusMap: Record<string, NodeExecutionStatus>

  startRun: (workflowId: string) => string
  updateStep: (runId: string, step: NodeExecutionStep) => void
  completeRun: (runId: string, result: Partial<ExecutionResult>) => void
  setActiveResult: (id: string | null) => void
  reset: () => void
}

let runCounter = 0

/** Build a stable status map from the active result's steps.
 *  Only includes terminal or active statuses to avoid excessive re-renders. */
function buildNodeStatusMap(results: ExecutionResult[], activeResultId: string | null): Record<string, NodeExecutionStatus> {
  if (!activeResultId) return {}
  try {
    const activeResult = results.find((r) => r.runId === activeResultId)
    if (!activeResult) return {}
    const map: Record<string, NodeExecutionStatus> = {}
    for (const step of activeResult.steps) {
      // Always use the latest status for each node
      map[step.nodeId] = step.status
    }
    return map
  } catch {
    return {}
  }
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isRunning: false,
  currentRunId: null,
  results: [],
  activeResultId: null,
  nodeStatusMap: {},

  startRun: (workflowId: string) => {
    const runId = `run-${++runCounter}-${Date.now()}`
    const result: ExecutionResult = {
      runId,
      workflowId,
      status: 'running',
      steps: [],
      totalDurationMs: 0,
      startedAt: new Date().toISOString(),
    }
    const newResults = [result, ...get().results]
    set({
      isRunning: true,
      currentRunId: runId,
      results: newResults,
      activeResultId: runId,
      nodeStatusMap: {},
    })
    return runId
  },

  updateStep: (runId, step) => {
    try {
      const prev = get()
      const newResults = prev.results.map((r) =>
        r.runId === runId
          ? { ...r, steps: [...r.steps.filter((st) => st.nodeId !== step.nodeId), step] }
          : r
      )
      set({
        results: newResults,
        nodeStatusMap: buildNodeStatusMap(newResults, prev.activeResultId),
      })
    } catch (err) {
      console.error('[OpenWorkflow] updateStep error:', err)
    }
  },

  completeRun: (runId, updates) => {
    try {
      const s = get()
      const newResults = s.results.map((r) =>
        r.runId === runId ? { ...r, ...updates, finishedAt: new Date().toISOString() } : r
      )
      set({
        isRunning: false,
        currentRunId: s.currentRunId === runId ? null : s.currentRunId,
        results: newResults,
        nodeStatusMap: buildNodeStatusMap(newResults, s.activeResultId),
      })
    } catch (err) {
      console.error('[OpenWorkflow] completeRun error:', err)
      // Force reset isRunning to prevent stuck state
      set({ isRunning: false, currentRunId: null })
    }
  },

  setActiveResult: (id) => {
    const newResults = get().results
    set({
      activeResultId: id,
      nodeStatusMap: buildNodeStatusMap(newResults, id),
    })
  },

  reset: () => set({ isRunning: false, currentRunId: null, results: [], activeResultId: null, nodeStatusMap: {} }),
}))
