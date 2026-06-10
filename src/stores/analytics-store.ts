// ─── Analytics Zustand Store ──────────────────────
// Client-side state management for live analytics.
// Manages SSE connection for real-time updates and
// fetches platform/workflow metrics from the API.

import { create } from 'zustand'
import type { PlatformMetrics, WorkflowMetrics, RealtimeMetrics } from '@/lib/analytics'

// ─── Types ──────────────────────────────────────────

interface AnalyticsState {
  /** Platform-wide metrics */
  platformMetrics: PlatformMetrics | null
  /** Per-workflow metrics cache */
  workflowMetrics: Map<string, WorkflowMetrics>
  /** Real-time metrics from SSE */
  realtimeMetrics: RealtimeMetrics
  /** Whether initial data is loading */
  isLoading: boolean
  /** Whether live SSE connection is active */
  isLiveConnected: boolean
  /** Last error message */
  error: string | null

  // ─── Actions ───────────────────────────────────

  /** Fetch platform-wide metrics from the API */
  fetchPlatformMetrics: () => Promise<void>
  /** Fetch metrics for a specific workflow */
  fetchWorkflowMetrics: (workflowId: string) => Promise<void>
  /** Connect to the live SSE analytics stream */
  connectLive: () => void
  /** Disconnect from the live SSE analytics stream */
  disconnectLive: () => void
}

// ─── SSE connection ref ────────────────────────────

let liveEventSource: EventSource | null = null

// ─── Store ──────────────────────────────────────────

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  platformMetrics: null,
  workflowMetrics: new Map(),
  realtimeMetrics: {
    activeExecutions: 0,
    recentCompletions: 0,
    recentErrors: 0,
    avgResponseTime: 0,
  },
  isLoading: false,
  isLiveConnected: false,
  error: null,

  fetchPlatformMetrics: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/analytics')
      const json = await res.json()
      if (json.ok) {
        set({
          platformMetrics: json.data.platform,
          realtimeMetrics: json.data.realtime,
          isLoading: false,
        })
      } else {
        set({ error: json.error ?? 'Failed to fetch metrics', isLoading: false })
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Network error',
        isLoading: false,
      })
    }
  },

  fetchWorkflowMetrics: async (workflowId: string) => {
    try {
      const res = await fetch(`/api/analytics/${workflowId}`)
      const json = await res.json()
      if (json.ok) {
        const metrics = json.data as WorkflowMetrics
        set((state) => {
          const newMap = new Map(state.workflowMetrics)
          newMap.set(workflowId, metrics)
          return { workflowMetrics: newMap }
        })
      }
    } catch {
      // Silently fail — analytics are best-effort
    }
  },

  connectLive: () => {
    // Disconnect existing connection
    get().disconnectLive()

    try {
      const es = new EventSource('/api/analytics/live')
      liveEventSource = es

      es.addEventListener('connected', () => {
        set({ isLiveConnected: true })
      })

      es.addEventListener('metrics', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data)
          set({
            realtimeMetrics: {
              activeExecutions: data.activeExecutions ?? 0,
              recentCompletions: data.recentCompletions ?? 0,
              recentErrors: data.recentErrors ?? 0,
              avgResponseTime: data.avgResponseTime ?? 0,
            },
          })
        } catch {
          // Ignore malformed data
        }
      })

      es.addEventListener('alert', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data)
          console.warn('[Analytics Live Alert]', data.type, data.message)
        } catch {
          // Ignore
        }
      })

      es.addEventListener('heartbeat', () => {
        // Connection is alive
      })

      es.onerror = () => {
        set({ isLiveConnected: false })
        // EventSource auto-reconnects
      }
    } catch {
      set({ isLiveConnected: false })
    }
  },

  disconnectLive: () => {
    if (liveEventSource) {
      liveEventSource.close()
      liveEventSource = null
    }
    set({ isLiveConnected: false })
  },
}))
