import { create } from 'zustand'
import type { ExecutionResult, NodeExecutionStep } from '@/lib/types'

interface ExecutionState {
  isRunning: boolean
  currentRunId: string | null
  results: ExecutionResult[]
  activeResultId: string | null

  startRun: (workflowId: string) => string
  updateStep: (runId: string, step: NodeExecutionStep) => void
  completeRun: (runId: string, result: Partial<ExecutionResult>) => void
  setActiveResult: (id: string | null) => void
  reset: () => void
}

let runCounter = 0

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  isRunning: false,
  currentRunId: null,
  results: [],
  activeResultId: null,

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
    set((s) => ({
      isRunning: true,
      currentRunId: runId,
      results: [result, ...s.results],
      activeResultId: runId,
    }))
    return runId
  },

  updateStep: (runId, step) => {
    set((s) => ({
      results: s.results.map((r) =>
        r.runId === runId
          ? { ...r, steps: [...r.steps.filter((st) => st.nodeId !== step.nodeId), step] }
          : r
      ),
    }))
  },

  completeRun: (runId, updates) => {
    set((s) => ({
      isRunning: false,
      currentRunId: s.currentRunId === runId ? null : s.currentRunId,
      results: s.results.map((r) =>
        r.runId === runId ? { ...r, ...updates, finishedAt: new Date().toISOString() } : r
      ),
    }))
  },

  setActiveResult: (id) => set({ activeResultId: id }),

  reset: () => set({ isRunning: false, currentRunId: null, results: [], activeResultId: null }),
}))
