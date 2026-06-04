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

/** Build a stable status map from the active result's steps */
function buildNodeStatusMap(results: ExecutionResult[], activeResultId: string | null): Record<string, NodeExecutionStatus> {
  if (!activeResultId) return {}
  const activeResult = results.find((r) => r.runId === activeResultId)
  if (!activeResult) return {}
  const map: Record<string, NodeExecutionStatus> = {}
  for (const step of activeResult.steps) {
    map[step.nodeId] = step.status
  }
  return map
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
      nodeStatusMap: buildNodeStatusMap(newResults, runId),
    })
    return runId
  },

  updateStep: (runId, step) => {
    const newResults = get().results.map((r) =>
      r.runId === runId
        ? { ...r, steps: [...r.steps.filter((st) => st.nodeId !== step.nodeId), step] }
        : r
    )
    set({
      results: newResults,
      nodeStatusMap: buildNodeStatusMap(newResults, get().activeResultId),
    })
  },

  completeRun: (runId, updates) => {
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
