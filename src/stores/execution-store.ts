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
  forceResetRunning: () => void
  setActiveResult: (id: string | null) => void
  reset: () => void
}

let runCounter = 0

// ─── Safety timeout tracking ──────────────────────
// If a run takes longer than MAX_RUN_DURATION_MS, force-reset isRunning
const MAX_RUN_DURATION_MS = 60_000 // 60 seconds
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>()

function startSafetyTimer(runId: string) {
  clearSafetyTimer(runId)
  const timer = setTimeout(() => {
    console.warn(`[OpenWorkflow] Safety timeout: force-resetting run ${runId} after ${MAX_RUN_DURATION_MS}ms`)
    try {
      const store = useExecutionStore.getState()
      if (store.isRunning && store.currentRunId === runId) {
        store.completeRun(runId, {
          status: 'error',
          output: { error: 'Execution timed out (safety limit)' },
          totalDurationMs: MAX_RUN_DURATION_MS,
        })
      }
    } catch {
      useExecutionStore.setState({ isRunning: false, currentRunId: null })
    }
  }, MAX_RUN_DURATION_MS)
  activeTimers.set(runId, timer)
}

function clearSafetyTimer(runId: string) {
  const timer = activeTimers.get(runId)
  if (timer) {
    clearTimeout(timer)
    activeTimers.delete(runId)
  }
}

// ─── Batched updates ─────────────────────────────
// Collect updateStep calls and flush them at most every FLUSH_INTERVAL_MS
// This prevents render storms when many nodes update in quick succession.
const FLUSH_INTERVAL_MS = 80
const pendingSteps = new Map<string, NodeExecutionStep>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushPendingSteps()
  }, FLUSH_INTERVAL_MS)
}

function flushPendingSteps() {
  if (pendingSteps.size === 0) return
  // Copy and clear pending steps
  const steps = new Map(pendingSteps)
  pendingSteps.clear()

  try {
    const prev = useExecutionStore.getState()
    let newResults = prev.results

    // Group steps by runId
    const byRun = new Map<string, NodeExecutionStep[]>()
    for (const [runId, step] of steps) {
      const list = byRun.get(runId) ?? []
      list.push(step)
      byRun.set(runId, list)
    }

    for (const [runId, runSteps] of byRun) {
      newResults = newResults.map((r) => {
        if (r.runId !== runId) return r
        const updatedSteps = [...r.steps]
        for (const step of runSteps) {
          const idx = updatedSteps.findIndex((s) => s.nodeId === step.nodeId)
          if (idx >= 0) {
            updatedSteps[idx] = step
          } else {
            updatedSteps.push(step)
          }
        }
        return { ...r, steps: updatedSteps }
      })
    }

    useExecutionStore.setState({
      results: newResults,
      nodeStatusMap: buildNodeStatusMap(newResults, prev.activeResultId),
    })
  } catch (err) {
    console.error('[OpenWorkflow] flushPendingSteps error:', err)
  }
}

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

// ─── Max stored results ──────────────────────────
const MAX_RESULTS = 20

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
    // Trim old results to prevent memory leak
    const prevResults = get().results.slice(0, MAX_RESULTS - 1)
    const newResults = [result, ...prevResults]
    set({
      isRunning: true,
      currentRunId: runId,
      results: newResults,
      activeResultId: runId,
      nodeStatusMap: {},
    })
    // Start safety timer
    startSafetyTimer(runId)
    return runId
  },

  updateStep: (runId, step) => {
    try {
      // Queue the step for batched processing instead of immediate state update
      pendingSteps.set(runId, step)
      scheduleFlush()
    } catch (err) {
      console.error('[OpenWorkflow] updateStep error:', err)
    }
  },

  completeRun: (runId, updates) => {
    try {
      // Flush any pending steps first to ensure final state is correct
      flushPendingSteps()

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
    } finally {
      // Always clear the safety timer
      clearSafetyTimer(runId)
    }
  },

  forceResetRunning: () => {
    // Emergency reset — called when we detect a stuck isRunning state
    const s = get()
    if (s.currentRunId) {
      clearSafetyTimer(s.currentRunId)
    }
    set({ isRunning: false, currentRunId: null })
  },

  setActiveResult: (id) => {
    // Flush pending steps before switching results
    flushPendingSteps()
    const newResults = get().results
    set({
      activeResultId: id,
      nodeStatusMap: buildNodeStatusMap(newResults, id),
    })
  },

  reset: () => {
    // Clear all timers and pending state
    for (const runId of activeTimers.keys()) {
      clearSafetyTimer(runId)
    }
    pendingSteps.clear()
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    set({ isRunning: false, currentRunId: null, results: [], activeResultId: null, nodeStatusMap: {} })
  },
}))
