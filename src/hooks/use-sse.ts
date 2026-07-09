// ─── useSSE Hook ─────────────────────────────────
// Client-side hook for receiving Server-Sent Events
// from the /api/events endpoint
//
// Also creates in-app notifications for:
// - execution events (complete/fail)
// - approval events (new approval)
// - trigger events (fired)
// - integration events (connected/error)

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useExecutionStore } from '@/stores/execution-store'
import { useApprovalStore } from '@/stores/approval-store'
import { useNotificationStore } from '@/stores/notification-store'

interface SSEMessage {
  action: string
  [key: string]: unknown
}

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null)
  const updateStep = useExecutionStore((s) => s.updateStep)
  const addApproval = useApprovalStore((s) => s.addRequest)
  const addNotification = useNotificationStore((s) => s.addNotification)

  const connect = useCallback(() => {
    if (eventSourceRef.current) return // Already connected

    try {
      const es = new EventSource('/api/events')
      eventSourceRef.current = es

      es.addEventListener('connected', (e) => {
        console.log('[SSE] Connected:', (e as MessageEvent).data)
      })

      es.addEventListener('execution', (e) => {
        try {
          const msg: SSEMessage = JSON.parse((e as MessageEvent).data)
          if (msg.action === 'step_update' && msg.nodeId && msg.status) {
            updateStep(msg.runId as string, {
              nodeId: msg.nodeId as string,
              nodeType: (msg.nodeType as any) ?? 'unknown',
              label: (msg.nodeLabel as string) ?? '',
              startedAt: (msg.startedAt as string) ?? new Date().toISOString(),
              status: msg.status as 'running' | 'success' | 'error' | 'pending',
              input: msg.input,
              output: msg.output as Record<string, unknown> | undefined,
            })
          }

          // Create notifications for execution events
          if (msg.action === 'step_update') {
            const status = msg.status as string
            const nodeLabel = (msg.nodeLabel as string) ?? 'Node'

            if (status === 'success') {
              addNotification({
                type: 'execution_complete',
                title: 'Workflow step completed',
                message: `"${nodeLabel}" finished successfully`,
                category: 'execution',
                priority: 'low',
                actionUrl: '/dashboard',
                metadata: JSON.stringify({ nodeId: msg.nodeId, runId: msg.runId }),
              })
            } else if (status === 'error') {
              addNotification({
                type: 'error_alert',
                title: 'Workflow step failed',
                message: `"${nodeLabel}" encountered an error`,
                category: 'execution',
                priority: 'high',
                actionUrl: '/dashboard',
                metadata: JSON.stringify({ nodeId: msg.nodeId, runId: msg.runId }),
              })
            }
          }

          if (msg.action === 'run_complete') {
            const status = msg.status as string
            addNotification({
              type: 'execution_complete',
              title: status === 'success' ? 'Workflow completed' : 'Workflow failed',
              message: status === 'success'
                ? `Run finished successfully in ${msg.duration ?? 0}ms`
                : `Run failed: ${(msg.error as string) ?? 'Unknown error'}`,
              category: 'execution',
              priority: status === 'success' ? 'normal' : 'high',
              actionUrl: '/dashboard',
              metadata: JSON.stringify({ runId: msg.runId }),
            })
          }
        } catch {}
      })

      es.addEventListener('approval', (e) => {
        try {
          const msg: SSEMessage = JSON.parse((e as MessageEvent).data)
          if (msg.action === 'new_approval') {
            addApproval({
              id: msg.id as string,
              runId: (msg.runId as string) ?? '',
              nodeId: msg.nodeId as string,
              workflowId: (msg.workflowId as string) ?? '',
              assignee: msg.assignee as string | undefined,
              status: 'pending',
              context: (msg.context as Record<string, unknown>) ?? {},
              createdAt: new Date().toISOString(),
              slaDeadline: msg.slaDeadline as string | undefined,
            })

            // Create notification for new approval
            addNotification({
              type: 'approval_needed',
              title: 'Approval needed',
              message: `"${(msg.nodeLabel as string) ?? 'Node'}" requires your review`,
              category: 'approval',
              priority: 'high',
              actionUrl: '/',
              metadata: JSON.stringify({ approvalId: msg.id, nodeId: msg.nodeId }),
            })
          }
        } catch {}
      })

      es.addEventListener('trigger', (e) => {
        try {
          const msg: SSEMessage = JSON.parse((e as MessageEvent).data)
          console.log('[SSE] Trigger event:', msg.action, msg.triggerType)

          // Create notification for trigger events
          if (msg.action === 'trigger_fired' || msg.action === 'fired') {
            const triggerType = (msg.triggerType as string) ?? 'unknown'
            addNotification({
              type: 'trigger_fired',
              title: 'Trigger fired',
              message: `${triggerType.charAt(0).toUpperCase() + triggerType.slice(1)} trigger activated`,
              category: 'trigger',
              priority: 'normal',
              metadata: JSON.stringify({ triggerType, workflowId: msg.workflowId }),
            })
          }
        } catch {}
      })

      es.addEventListener('integration', (e) => {
        try {
          const msg: SSEMessage = JSON.parse((e as MessageEvent).data)

          if (msg.action === 'connected' || msg.action === 'integration_connected') {
            addNotification({
              type: 'integration_connected',
              title: 'Integration connected',
              message: `${(msg.integrationName as string) ?? 'Integration'} is now connected`,
              category: 'integration',
              priority: 'normal',
              metadata: JSON.stringify({ integrationId: msg.integrationId }),
            })
          } else if (msg.action === 'error' || msg.action === 'integration_error') {
            addNotification({
              type: 'error_alert',
              title: 'Integration error',
              message: `${(msg.integrationName as string) ?? 'Integration'} encountered an error`,
              category: 'integration',
              priority: 'high',
              metadata: JSON.stringify({ integrationId: msg.integrationId, error: msg.error }),
            })
          }
        } catch {}
      })

      es.addEventListener('heartbeat', () => {
        // Connection is alive
      })

      es.onerror = () => {
        // Auto-reconnect is handled by EventSource
        console.log('[SSE] Connection lost, will reconnect...')
      }
    } catch {
      console.error('[SSE] Failed to connect')
    }
  }, [updateStep, addApproval, addNotification])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { connect, disconnect }
}
